import "server-only";

import { and, desc, eq, ne } from "drizzle-orm";

import { db } from "@/db";
import { abyssItems, appSettings, goals } from "@/db/tables";
import { deriveCategorySignal, detectEaseOffCandidates } from "@/lib/planning/goal-coach-signal";
import { categoryLabel, PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";
import {
  DEFAULT_GOAL_COACH_AMBITION,
  goalCoachAmbitionSchema,
  type GoalCoachAmbition,
} from "@/lib/settings/constants";

import { loadEasedCategories, loadGoalProposalOutcomes } from "./goal-coach-adaptations";
import { listThreadMessages } from "./persist-message";
import type { PlanContextSnapshot } from "./fetch-plan-context";

const MAX_CONTEXT_CHARS = 10_000;
const MAX_HISTORY_MESSAGES = 20;
const MAX_PAST_GOALS = 40;
const MAX_ABYSS_ITEMS = 15;

function truncateContext(text: string): string {
  if (text.length <= MAX_CONTEXT_CHARS) return text;
  return `${text.slice(0, MAX_CONTEXT_CHARS)}\n…(truncated)`;
}

type GoalRow = {
  id: string;
  targetYear: number | null;
  title: string;
  category: ProjectCategory;
  state: "active" | "done" | "backburnered";
};

/** Count of goals per category — drives the balance read the coach sees. */
function categoryBalance(rows: readonly GoalRow[]): Record<ProjectCategory, number> {
  const counts = Object.fromEntries(PROJECT_CATEGORIES.map((c) => [c, 0])) as Record<
    ProjectCategory,
    number
  >;
  for (const row of rows) counts[row.category] += 1;
  return counts;
}

/**
 * Load the goal-coaching source data for a user, split into the current year (the
 * latest target year on record) and prior years. Shared by the context builder and
 * the query_goals / query_past_goals read tools so they never drift.
 *
 * Goals with no target year are treated as belonging to the current year.
 */
export async function loadCoachGoalData(userId: string): Promise<{
  currentYear: number | null;
  currentGoals: GoalRow[];
  pastGoalsByYear: { year: number; goals: GoalRow[] }[];
}> {
  const goalRows = (await db
    .select({
      id: goals.id,
      targetYear: goals.targetYear,
      title: goals.title,
      category: goals.category,
      state: goals.state,
    })
    .from(goals)
    .where(eq(goals.userId, userId))) as GoalRow[];

  if (goalRows.length === 0) {
    return { currentYear: null, currentGoals: [], pastGoalsByYear: [] };
  }

  const years = goalRows.flatMap((g) => (g.targetYear != null ? [g.targetYear] : []));
  const currentYear = years.length > 0 ? Math.max(...years) : new Date().getFullYear();

  const currentGoals: GoalRow[] = [];
  const byYear = new Map<number, GoalRow[]>();
  for (const goal of goalRows) {
    if (goal.targetYear == null || goal.targetYear === currentYear) {
      currentGoals.push(goal);
      continue;
    }
    const list = byYear.get(goal.targetYear) ?? [];
    list.push(goal);
    byYear.set(goal.targetYear, list);
  }

  return {
    currentYear,
    currentGoals,
    pastGoalsByYear: Array.from(byYear.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, rows]) => ({ year, goals: rows })),
  };
}

/** Structured current-year read for the query_goals tool. */
export async function queryCoachCurrentGoals(userId: string) {
  const { currentYear, currentGoals } = await loadCoachGoalData(userId);
  if (currentYear == null) {
    return { ok: true as const, year: null, balance: {}, goals: [] as unknown[] };
  }

  return {
    ok: true as const,
    year: currentYear,
    balance: categoryBalance(currentGoals),
    goals: currentGoals.map((g) => ({
      title: g.title,
      category: g.category,
      state: g.state,
    })),
  };
}

/** Structured prior-years read for the query_past_goals tool. */
export async function queryCoachPastGoals(userId: string, limit = MAX_PAST_GOALS) {
  const { pastGoalsByYear } = await loadCoachGoalData(userId);
  const cap = Math.min(Math.max(limit, 1), MAX_PAST_GOALS);
  const flattened = pastGoalsByYear.flatMap(({ year, goals: yearGoals }) =>
    yearGoals.map((g) => ({
      title: g.title,
      category: g.category,
      year,
      completed: g.state === "done",
    }))
  );
  return {
    ok: true as const,
    count: Math.min(flattened.length, cap),
    goals: flattened.slice(0, cap),
  };
}

const AMBITION_LINE: Record<GoalCoachAmbition, string> = {
  gentle: "Ambition: gentle — keep suggestions modest, achievable, and low-pressure.",
  balanced: "Ambition: balanced — mix comfortably achievable goals with a few gentle stretches.",
  stretch: "Ambition: stretch — lean toward bold goals that would make the year stand out.",
};

/** Coaching-preferences block (J2): the ambition dial + the user's free-text steer. */
function formatCoachPrefsBlock(ambition: GoalCoachAmbition, note: string): string {
  const lines = ["Coaching preferences (honor these):", AMBITION_LINE[ambition]];
  if (note.trim()) lines.push(`The user asked you to keep in mind: ${note.trim()}`);
  return lines.join("\n");
}

/**
 * J3 learned-signal block. Surfaces (a) categories the user consented to ease off — honor
 * silently — and (b) a fresh skip pattern the coach may *raise and ask about*, never adapt
 * to on its own. Returns null when there's nothing to say.
 */
function formatLearnedSignalBlock(
  easeOffCandidates: readonly ProjectCategory[],
  easedCategories: readonly ProjectCategory[]
): string | null {
  const lines: string[] = [];
  if (easedCategories.length > 0) {
    const labels = easedCategories.map(categoryLabel).join(", ");
    lines.push(
      `The user has asked you to ease off these categories: ${labels}. Don't suggest goals there unless the user brings them up; they can lift this any time.`
    );
  }
  if (easeOffCandidates.length > 0) {
    const labels = easeOffCandidates.map(categoryLabel).join(", ");
    lines.push(
      `You've noticed the user keeps passing on suggestions in: ${labels}. If it feels natural, you MAY gently check whether they'd like you to ease off there for now — but ask first and only adapt (via set_goal_coaching_adjustment) if they say yes. Never announce counts, and never silently stop suggesting.`
    );
  }
  if (lines.length === 0) return null;
  return ["What you've learned about their preferences:", ...lines].join("\n");
}

function formatBalanceLine(balance: Record<ProjectCategory, number>): string {
  const parts = PROJECT_CATEGORIES.map((c) => `${categoryLabel(c)} ${balance[c]}`);
  return `Category balance: ${parts.join(", ")}`;
}

function formatGoalLines(rows: GoalRow[]): string {
  if (rows.length === 0) return "  (no goals yet)";
  return rows
    .map((g) => {
      const stateSuffix =
        g.state === "done" ? " (done)" : g.state === "backburnered" ? " (paused)" : "";
      return `  - ${g.title} [${categoryLabel(g.category)}]${stateSuffix}`;
    })
    .join("\n");
}

/**
 * Assemble the goal-coaching context block (parallel to fetchPlanContextSnapshot). Includes
 * this year's goals + balance, prior years' goals for continuity, and parked ideas as raw
 * inspiration. Deliberately contains NO active tasks — the coach must not repackage them.
 */
export async function fetchGoalsContextSnapshot(
  userId: string,
  threadId: string
): Promise<PlanContextSnapshot> {
  const [
    { currentYear, currentGoals, pastGoalsByYear },
    abyssRows,
    threadRows,
    settingsRows,
    easedCategories,
    proposalOutcomes,
  ] = await Promise.all([
    loadCoachGoalData(userId),
    db
      .select({ title: abyssItems.title, category: abyssItems.category })
      .from(abyssItems)
      .where(and(eq(abyssItems.userId, userId), ne(abyssItems.status, "archived")))
      .orderBy(desc(abyssItems.lastTouchedAt))
      .limit(MAX_ABYSS_ITEMS),
    listThreadMessages(userId, threadId, MAX_HISTORY_MESSAGES),
    db
      .select({
        goalCoachAmbition: appSettings.goalCoachAmbition,
        goalCoachNote: appSettings.goalCoachNote,
      })
      .from(appSettings)
      .where(eq(appSettings.userId, userId))
      .limit(1),
    loadEasedCategories(userId),
    loadGoalProposalOutcomes(userId, threadId),
  ]);

  const settings = settingsRows[0];
  const ambition = goalCoachAmbitionSchema.safeParse(settings?.goalCoachAmbition).success
    ? (settings!.goalCoachAmbition as GoalCoachAmbition)
    : DEFAULT_GOAL_COACH_AMBITION;

  const sections: string[] = [formatCoachPrefsBlock(ambition, settings?.goalCoachNote ?? "")];

  const easeOffCandidates = detectEaseOffCandidates(
    deriveCategorySignal(proposalOutcomes),
    easedCategories
  );
  const learnedSignal = formatLearnedSignalBlock(easeOffCandidates, easedCategories);
  if (learnedSignal) sections.push(learnedSignal);

  if (currentYear != null) {
    sections.push(
      `This year's goals (${currentYear}): ${currentGoals.length} on record.`,
      formatBalanceLine(categoryBalance(currentGoals)),
      `Goals:\n${formatGoalLines(currentGoals)}`
    );
  } else {
    sections.push("No goals yet — this is a fresh start.");
  }

  if (pastGoalsByYear.length > 0) {
    const pastBlock = pastGoalsByYear
      .map(({ year, goals: yearGoals }) => `${year}:\n${formatGoalLines(yearGoals)}`)
      .join("\n");
    sections.push(`Previous years' goals (for continuity):\n${pastBlock}`);
  }

  if (abyssRows.length > 0) {
    const abyssBlock = abyssRows
      .map((a) => `  - ${a.title}${a.category ? ` [${categoryLabel(a.category)}]` : ""}`)
      .join("\n");
    sections.push(
      `Parked ideas (raw inspiration only — never schedule these or treat them as tasks):\n${abyssBlock}`
    );
  }

  const contextBlock = truncateContext(sections.join("\n\n"));

  const history = threadRows
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      text:
        typeof m.content === "object" && m.content && "text" in m.content
          ? String(m.content.text)
          : "",
    }))
    .filter((m) => m.text.length > 0);

  return { contextBlock, history };
}

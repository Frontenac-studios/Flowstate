import "server-only";

import { and, desc, eq, ne } from "drizzle-orm";

import { db } from "@/db";
import { abyssItems, appSettings, bingoCards, goals } from "@/db/tables";
import { BINGO_CELL_COUNT, BINGO_FREE_CELL_INDEX } from "@/db/schema/planning-enums";
import type { BingoGoal } from "@/lib/planning/bingo-grid";
import { categoryBalance } from "@/lib/planning/bingo-grid";
import { categoryLabel, PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";
import {
  DEFAULT_GOAL_COACH_AMBITION,
  goalCoachAmbitionSchema,
  type GoalCoachAmbition,
} from "@/lib/settings/constants";

import { listThreadMessages } from "./persist-message";
import type { PlanContextSnapshot } from "./fetch-plan-context";

const MAX_CONTEXT_CHARS = 10_000;
const MAX_HISTORY_MESSAGES = 20;
const MAX_PAST_GOALS = 40;
const MAX_ABYSS_ITEMS = 15;

/** Squares available to hold a goal (25 total minus the FREE center). */
const PLACEABLE_CELLS = BINGO_CELL_COUNT - 1;

function truncateContext(text: string): string {
  if (text.length <= MAX_CONTEXT_CHARS) return text;
  return `${text.slice(0, MAX_CONTEXT_CHARS)}\n…(truncated)`;
}

type CardRow = { id: string; cardYear: number; status: "draft" | "final" };
type GoalRow = {
  id: string;
  bingoCardId: string | null;
  title: string;
  category: ProjectCategory;
  cellIndex: number | null;
  state: "active" | "done" | "backburnered";
};

function isPlacedGoal(cellIndex: number | null): cellIndex is number {
  return (
    cellIndex != null &&
    cellIndex !== BINGO_FREE_CELL_INDEX &&
    cellIndex >= 0 &&
    cellIndex < BINGO_CELL_COUNT
  );
}

function toBingoGoal(row: GoalRow): BingoGoal {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    cellIndex: row.cellIndex,
    state: row.state,
  };
}

/**
 * Load the goal-coaching source data for a user, split into the current card (the
 * latest year) and prior years. Shared by the context builder and the query_goals /
 * query_past_goals read tools so they never drift.
 *
 * NOTE: "current" = the highest card year. Phase 3's per-card-year coaching thread can
 * refine this to the exact card the session is about.
 */
export async function loadCoachGoalData(userId: string): Promise<{
  currentCard: CardRow | null;
  currentGoals: GoalRow[];
  pastCardsByYear: { card: CardRow; goals: GoalRow[] }[];
}> {
  const cardRows = (await db
    .select({ id: bingoCards.id, cardYear: bingoCards.cardYear, status: bingoCards.status })
    .from(bingoCards)
    .where(eq(bingoCards.userId, userId))
    .orderBy(desc(bingoCards.cardYear))) as CardRow[];

  if (cardRows.length === 0) {
    return { currentCard: null, currentGoals: [], pastCardsByYear: [] };
  }

  const goalRows = (await db
    .select({
      id: goals.id,
      bingoCardId: goals.bingoCardId,
      title: goals.title,
      category: goals.category,
      cellIndex: goals.cellIndex,
      state: goals.state,
    })
    .from(goals)
    .where(eq(goals.userId, userId))) as GoalRow[];

  const goalsByCard = new Map<string, GoalRow[]>();
  for (const goal of goalRows) {
    if (!goal.bingoCardId) continue;
    const list = goalsByCard.get(goal.bingoCardId) ?? [];
    list.push(goal);
    goalsByCard.set(goal.bingoCardId, list);
  }

  const [currentCard, ...pastCards] = cardRows;
  return {
    currentCard: currentCard ?? null,
    currentGoals: currentCard ? (goalsByCard.get(currentCard.id) ?? []) : [],
    pastCardsByYear: pastCards.map((card) => ({
      card,
      goals: goalsByCard.get(card.id) ?? [],
    })),
  };
}

/** Structured current-card read for the query_goals tool. */
export async function queryCoachCurrentGoals(userId: string) {
  const { currentCard, currentGoals } = await loadCoachGoalData(userId);
  if (!currentCard) {
    return { ok: true as const, card: null, balance: {}, goals: [] as unknown[] };
  }

  const placed = currentGoals.filter((g) => isPlacedGoal(g.cellIndex));
  const balance = categoryBalance(currentGoals.map(toBingoGoal));

  return {
    ok: true as const,
    card: {
      year: currentCard.cardYear,
      status: currentCard.status,
      placed: placed.length,
      empty: PLACEABLE_CELLS - placed.length,
    },
    balance,
    goals: currentGoals.map((g) => ({
      title: g.title,
      category: g.category,
      state: g.state,
      cellIndex: g.cellIndex,
    })),
  };
}

/** Structured prior-years read for the query_past_goals tool. */
export async function queryCoachPastGoals(userId: string, limit = MAX_PAST_GOALS) {
  const { pastCardsByYear } = await loadCoachGoalData(userId);
  const cap = Math.min(Math.max(limit, 1), MAX_PAST_GOALS);
  const flattened = pastCardsByYear.flatMap(({ card, goals: cardGoals }) =>
    cardGoals.map((g) => ({
      title: g.title,
      category: g.category,
      year: card.cardYear,
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

function formatBalanceLine(balance: Record<ProjectCategory, number>): string {
  const parts = PROJECT_CATEGORIES.map((c) => `${categoryLabel(c)} ${balance[c]}`);
  return `Category balance (placed goals): ${parts.join(", ")}`;
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
 * the current card + balance, prior years' goals for continuity, and parked ideas as raw
 * inspiration. Deliberately contains NO active tasks — the coach must not repackage them.
 */
export async function fetchGoalsContextSnapshot(
  userId: string,
  threadId: string
): Promise<PlanContextSnapshot> {
  const [{ currentCard, currentGoals, pastCardsByYear }, abyssRows, threadRows, settingsRows] =
    await Promise.all([
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
    ]);

  const settings = settingsRows[0];
  const ambition = goalCoachAmbitionSchema.safeParse(settings?.goalCoachAmbition).success
    ? (settings!.goalCoachAmbition as GoalCoachAmbition)
    : DEFAULT_GOAL_COACH_AMBITION;

  const sections: string[] = [formatCoachPrefsBlock(ambition, settings?.goalCoachNote ?? "")];

  if (currentCard) {
    const placed = currentGoals.filter((g) => isPlacedGoal(g.cellIndex));
    const empty = PLACEABLE_CELLS - placed.length;
    const balance = categoryBalance(currentGoals.map(toBingoGoal));
    sections.push(
      `This year's bingo card (${currentCard.cardYear}, ${currentCard.status}): ${placed.length} of ${PLACEABLE_CELLS} squares filled, ${empty} empty.`,
      formatBalanceLine(balance),
      `Goals on the card:\n${formatGoalLines(currentGoals)}`
    );
  } else {
    sections.push("No bingo card yet — this is a fresh start.");
  }

  if (pastCardsByYear.length > 0) {
    const pastBlock = pastCardsByYear
      .map(({ card, goals: cardGoals }) => `${card.cardYear}:\n${formatGoalLines(cardGoals)}`)
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

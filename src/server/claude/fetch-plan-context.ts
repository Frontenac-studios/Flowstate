import "server-only";

import { and, desc, eq, gte, inArray, isNotNull, isNull, lt, lte, ne, or } from "drizzle-orm";

import { db } from "@/db";
import { phases, projects, protectedBlocks, taskTimeEntries, tasks } from "@/db/tables";
import {
  addDays,
  datesInIsoWeek,
  startOfIsoWeekMonday,
  startOfLocalDay,
  toISODateString,
} from "@/lib/dates/local-day";
import type { CaptureContext } from "@/lib/chat/capture-context";
import {
  formatLooseTaskCounts,
  formatPlanTaskLines,
  formatProjectStructureBlock,
  formatWeekCategoryLoadSummary,
} from "@/lib/chat/format-plan-context";
import { evaluateTop3Stall } from "@/lib/nudges/evaluate-top3-stall";
import { partitionPlanTasks } from "@/lib/tasks/partition-plan-tasks";
import { taskIdForThread } from "@/lib/chat/threads";
import { computeWeekCategoryLoad } from "@/lib/week/week-category-load";

import { listThreadMessages } from "./persist-message";

export type PlanContextSnapshot = {
  contextBlock: string;
  history: { role: "user" | "assistant"; text: string }[];
};

const MAX_CONTEXT_CHARS = 10_000;
const MAX_HISTORY_MESSAGES = 20;

function truncateContext(text: string): string {
  if (text.length <= MAX_CONTEXT_CHARS) return text;
  return `${text.slice(0, MAX_CONTEXT_CHARS)}\n…(truncated)`;
}

/**
 * Render the phase tree + open-task counts for the project the user is capturing
 * into (from the chat capture context), marking the selected phase. Returns an
 * empty string when there is no project context.
 */
async function buildProjectStructureBlock(
  userId: string,
  captureContext?: CaptureContext | null
): Promise<string> {
  if (!captureContext) return "";
  const { projectId, projectSlug } = captureContext;
  if (!projectId && !projectSlug) return "";

  const projectRows = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(
      and(
        eq(projects.userId, userId),
        projectId ? eq(projects.id, projectId) : eq(projects.slug, projectSlug!)
      )
    )
    .limit(1);
  const project = projectRows[0];
  if (!project) return "";

  const [phaseRows, openTaskRows] = await Promise.all([
    db
      .select({
        id: phases.id,
        name: phases.name,
        parentPhaseId: phases.parentPhaseId,
        sortOrder: phases.sortOrder,
      })
      .from(phases)
      .where(and(eq(phases.userId, userId), eq(phases.projectId, project.id))),
    db
      .select({ phaseId: tasks.phaseId })
      .from(tasks)
      .where(
        and(eq(tasks.userId, userId), eq(tasks.projectId, project.id), isNull(tasks.completedAt))
      ),
  ]);

  const taskCountByPhaseId: Record<string, number> = {};
  for (const row of openTaskRows) {
    if (row.phaseId === null) continue;
    taskCountByPhaseId[row.phaseId] = (taskCountByPhaseId[row.phaseId] ?? 0) + 1;
  }

  return formatProjectStructureBlock({
    projectName: project.name,
    phases: phaseRows,
    taskCountByPhaseId,
    selectedPhaseId: captureContext.phaseId ?? null,
  });
}

export async function fetchPlanContextSnapshot(
  userId: string,
  threadId: string,
  captureContext?: CaptureContext | null
): Promise<PlanContextSnapshot> {
  const now = new Date();
  const todayIso = toISODateString(startOfLocalDay(now));
  const focusTaskId = taskIdForThread(threadId);
  const thisWeekDates = datesInIsoWeek(now).map(toISODateString);
  const weekStartIso = thisWeekDates[0]!;
  const weekEndIso = thisWeekDates[6]!;

  const [incompleteRows, top3Rows, triageRows, completedRows, protectedRows, threadRows] =
    await Promise.all([
      db
        .select({
          id: tasks.id,
          title: tasks.title,
          priority: tasks.priority,
          scheduledDate: tasks.scheduledDate,
          bucketOverride: tasks.bucketOverride,
          completedAt: tasks.completedAt,
          isTop3: tasks.isTop3,
          projectId: tasks.projectId,
          phaseId: tasks.phaseId,
          projectSlug: projects.slug,
          category: tasks.category,
          categoryUnresolved: tasks.categoryUnresolved,
          suggestedScheduledDate: tasks.suggestedScheduledDate,
        })
        .from(tasks)
        .leftJoin(projects, eq(tasks.projectId, projects.id))
        .where(and(eq(tasks.userId, userId), isNull(tasks.completedAt)))
        .orderBy(desc(tasks.priority)),
      db
        .select({
          id: tasks.id,
          top3Order: tasks.top3Order,
          title: tasks.title,
          top3PinnedAt: tasks.top3PinnedAt,
          scheduledDate: tasks.scheduledDate,
          completedAt: tasks.completedAt,
        })
        .from(tasks)
        .where(and(eq(tasks.userId, userId), eq(tasks.isTop3, true), isNotNull(tasks.top3Order)))
        .orderBy(tasks.top3Order),
      db
        .select({ id: tasks.id })
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, userId),
            isNull(tasks.completedAt),
            isNotNull(tasks.scheduledDate),
            lt(tasks.scheduledDate, todayIso),
            or(isNull(tasks.bucketOverride), ne(tasks.bucketOverride, "later"))
          )
        ),
      db
        .select({
          title: tasks.title,
          completedAt: tasks.completedAt,
          projectSlug: projects.slug,
        })
        .from(tasks)
        .leftJoin(projects, eq(tasks.projectId, projects.id))
        .where(and(eq(tasks.userId, userId), isNotNull(tasks.completedAt)))
        .orderBy(desc(tasks.completedAt))
        .limit(30),
      db
        .select({ category: protectedBlocks.category })
        .from(protectedBlocks)
        .where(
          and(
            eq(protectedBlocks.userId, userId),
            gte(protectedBlocks.scheduledDate, weekStartIso),
            lte(protectedBlocks.scheduledDate, weekEndIso),
            inArray(protectedBlocks.status, ["confirmed", "proposed"])
          )
        ),
      listThreadMessages(userId, threadId, MAX_HISTORY_MESSAGES),
    ]);

  const triageIds = new Set(triageRows.map((r) => r.id));
  const forPlan = incompleteRows.filter((t) => !triageIds.has(t.id));
  const partitioned = partitionPlanTasks(forPlan, now);

  const formatTasks = (label: string, list: typeof incompleteRows) =>
    formatPlanTaskLines(
      label,
      list.map((t) => ({
        id: t.id,
        title: t.title,
        isTop3: t.isTop3,
        priority: t.priority,
        projectSlug: t.projectSlug,
        scheduledDate: t.scheduledDate,
        category: t.category,
        categoryUnresolved: t.categoryUnresolved,
        suggestedScheduledDate: t.suggestedScheduledDate,
      }))
    );

  const nextWeekRef = addDays(startOfIsoWeekMonday(now), 7);
  const nextWeekDates = datesInIsoWeek(nextWeekRef).map(toISODateString);

  const top3Lines =
    top3Rows.length === 0
      ? "Top 3 slots: (empty)"
      : `Top 3:\n${top3Rows
          .map((s) => `  ${s.top3Order}. ${s.title}${s.completedAt ? " (done today)" : ""}`)
          .join("\n")}`;

  const serverTzOffset = -now.getTimezoneOffset();
  const slippedEvaluation = evaluateTop3Stall({
    now,
    tzOffsetMinutes: serverTzOffset,
    localDate: todayIso,
    top3Tasks: top3Rows
      .filter((r): r is typeof r & { top3Order: number } => r.top3Order !== null)
      .map((r) => ({
        id: r.id,
        title: r.title,
        top3Order: r.top3Order,
        top3PinnedAt: r.top3PinnedAt,
        scheduledDate: r.scheduledDate,
        completedAt: r.completedAt,
      })),
    timeEntriesToday: [],
    alreadyNudgedToday: true,
  });

  const slippedLines =
    slippedEvaluation.slippedTasks.length === 0
      ? "Top 3 slipped (2+ days): (none)"
      : `Top 3 slipped (2+ days):\n${slippedEvaluation.slippedTasks
          .map(
            (s) =>
              `  ${s.top3Order}. ${s.title} (pinned ${s.pinReferenceDate}, ${s.daysSlipped} days)`
          )
          .join("\n")}`;

  const completedLines =
    completedRows.length === 0
      ? "Recent completions: (none)"
      : `Recent completions:\n${completedRows
          .slice(0, 15)
          .map((t) => {
            const when = t.completedAt?.toISOString().slice(0, 10) ?? "?";
            const proj = t.projectSlug ? ` #${t.projectSlug}` : "";
            return `- ${t.title}${proj} (${when})`;
          })
          .join("\n")}`;

  let focusSection = "";
  if (focusTaskId) {
    const focusTask = incompleteRows.find((t) => t.id === focusTaskId);
    const timeRows = await db
      .select({
        startedAt: taskTimeEntries.startedAt,
        endedAt: taskTimeEntries.endedAt,
        reason: taskTimeEntries.reason,
      })
      .from(taskTimeEntries)
      .where(
        and(
          eq(taskTimeEntries.userId, userId),
          eq(taskTimeEntries.taskId, focusTaskId),
          isNotNull(taskTimeEntries.endedAt)
        )
      )
      .orderBy(desc(taskTimeEntries.startedAt))
      .limit(5);

    focusSection = `\nFocus task: ${focusTask?.title ?? "(unknown)"}`;
    if (timeRows.length > 0) {
      focusSection += `\nPrior focus sessions:\n${timeRows
        .map((e) => {
          const mins = e.endedAt
            ? Math.round((e.endedAt.getTime() - e.startedAt.getTime()) / 60_000)
            : 0;
          return `- ${mins}m (${e.reason})`;
        })
        .join("\n")}`;
    }
  }

  const looseCountsLine = formatLooseTaskCounts(
    incompleteRows
      .filter((t) => t.projectId === null)
      .map((t) => ({ category: t.category, categoryUnresolved: t.categoryUnresolved }))
  );

  const thisWeekSet = new Set(thisWeekDates);
  const scheduledInWeekForLoad = incompleteRows
    .filter((t) => t.scheduledDate !== null && thisWeekSet.has(t.scheduledDate))
    .map((t) => ({
      category: t.category,
      categoryUnresolved: t.categoryUnresolved,
      isTop3: t.isTop3,
    }));
  const weekCategoryLoad = computeWeekCategoryLoad({
    tasks: scheduledInWeekForLoad,
    protectedBlocks: protectedRows.map((r) => ({ category: r.category })),
  });
  const weekLoadLine = formatWeekCategoryLoadSummary(weekCategoryLoad);

  const projectStructureBlock = await buildProjectStructureBlock(userId, captureContext);

  const contextBlock = truncateContext(
    [
      `Today: ${todayIso}`,
      `This calendar week (Mon–Sun): ${thisWeekDates[0]} … ${thisWeekDates[6]}`,
      `Next calendar week (Mon–Sun): ${nextWeekDates[0]} … ${nextWeekDates[6]}`,
      `Triage backlog: ${triageRows.length} task(s) from prior days`,
      top3Lines,
      slippedLines,
      formatTasks("Today bucket", partitioned.today),
      formatTasks("Tomorrow", partitioned.tomorrow),
      formatTasks("This week", partitioned.thisWeek),
      formatTasks("Later", partitioned.later),
      looseCountsLine,
      weekLoadLine,
      projectStructureBlock,
      completedLines,
      focusSection,
    ].join("\n\n")
  );

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

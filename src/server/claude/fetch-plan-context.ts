import "server-only";

import { and, desc, eq, isNotNull, isNull, lt, ne, or } from "drizzle-orm";

import { db } from "@/db";
import { projects, taskTimeEntries, tasks } from "@/db/tables";
import { startOfLocalDay, toISODateString } from "@/lib/dates/local-day";
import { evaluateTop3Stall } from "@/lib/nudges/evaluate-top3-stall";
import { partitionPlanTasks } from "@/lib/tasks/partition-plan-tasks";
import { taskIdForThread } from "@/lib/chat/threads";

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

export async function fetchPlanContextSnapshot(
  userId: string,
  threadId: string
): Promise<PlanContextSnapshot> {
  const now = new Date();
  const todayIso = toISODateString(startOfLocalDay(now));
  const focusTaskId = taskIdForThread(threadId);

  const [incompleteRows, top3Rows, triageRows, completedRows, threadRows] = await Promise.all([
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        priority: tasks.priority,
        scheduledDate: tasks.scheduledDate,
        bucketOverride: tasks.bucketOverride,
        completedAt: tasks.completedAt,
        isTop3: tasks.isTop3,
        projectSlug: projects.slug,
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
    listThreadMessages(userId, threadId, MAX_HISTORY_MESSAGES),
  ]);

  const triageIds = new Set(triageRows.map((r) => r.id));
  const forPlan = incompleteRows.filter((t) => !triageIds.has(t.id));
  const partitioned = partitionPlanTasks(forPlan, now);

  const formatTasks = (label: string, list: typeof incompleteRows) => {
    if (list.length === 0) return `${label}: (none)`;
    const lines = list.map((t) => {
      const tags = [
        t.isTop3 ? "top3" : null,
        t.priority > 0 ? `p${t.priority}` : null,
        t.projectSlug ? `#${t.projectSlug}` : null,
      ]
        .filter(Boolean)
        .join(", ");
      return `- ${t.title}${tags ? ` (${tags})` : ""}`;
    });
    return `${label}:\n${lines.join("\n")}`;
  };

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

  const contextBlock = truncateContext(
    [
      `Today: ${todayIso}`,
      `Triage backlog: ${triageRows.length} task(s) from prior days`,
      top3Lines,
      slippedLines,
      formatTasks("Today bucket", partitioned.today),
      formatTasks("Tomorrow", partitioned.tomorrow),
      formatTasks("This week", partitioned.thisWeek),
      formatTasks("Later", partitioned.later),
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

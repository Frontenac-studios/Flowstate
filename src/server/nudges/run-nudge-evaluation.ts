import "server-only";

import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";

import { db } from "@/db";
import { nudgeEvents, taskTimeEntries, tasks } from "@/db/tables";
import { GLOBAL_THREAD_ID } from "@/lib/chat/threads";
import { evaluateTop3Stall } from "@/lib/nudges/evaluate-top3-stall";
import { startedOnLocalDay } from "@/lib/nudges/local-time";
import { appendAssistantMessage } from "@/server/claude/persist-message";
import { generateNudge } from "@/server/claude/generate-nudge";

export type NudgeEvaluateResult = {
  fired: boolean;
  messageId?: string;
  stalledCount: number;
  slippedCount: number;
};

export async function runNudgeEvaluation(params: {
  userId: string;
  localDate: string;
  tzOffsetMinutes: number;
}): Promise<NudgeEvaluateResult> {
  const { userId, localDate, tzOffsetMinutes } = params;
  const now = new Date();

  const [top3Rows, existingNudge, timeEntryRows] = await Promise.all([
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        top3Order: tasks.top3Order,
        top3PinnedAt: tasks.top3PinnedAt,
        scheduledDate: tasks.scheduledDate,
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.isTop3, true),
          isNotNull(tasks.top3Order),
          isNull(tasks.completedAt)
        )
      )
      .orderBy(asc(tasks.top3Order)),
    db
      .select({ id: nudgeEvents.id })
      .from(nudgeEvents)
      .where(
        and(
          eq(nudgeEvents.userId, userId),
          eq(nudgeEvents.kind, "top3_stall"),
          eq(nudgeEvents.localDate, localDate)
        )
      )
      .limit(1),
    db
      .select({
        taskId: taskTimeEntries.taskId,
        startedAt: taskTimeEntries.startedAt,
      })
      .from(taskTimeEntries)
      .where(eq(taskTimeEntries.userId, userId)),
  ]);

  const top3Tasks = top3Rows
    .filter((r): r is typeof r & { top3Order: number } => r.top3Order !== null)
    .map((r) => ({
      id: r.id,
      title: r.title,
      top3Order: r.top3Order,
      top3PinnedAt: r.top3PinnedAt,
      scheduledDate: r.scheduledDate,
      completedAt: r.completedAt,
    }));

  const timeEntriesToday = timeEntryRows
    .filter((e) => startedOnLocalDay(e.startedAt, localDate, tzOffsetMinutes))
    .map((e) => ({ taskId: e.taskId, startedAt: e.startedAt }));

  const evaluation = evaluateTop3Stall({
    now,
    tzOffsetMinutes,
    localDate,
    top3Tasks,
    timeEntriesToday,
    alreadyNudgedToday: existingNudge.length > 0,
  });

  if (!evaluation.shouldFireStallNudge) {
    return {
      fired: false,
      stalledCount: evaluation.stalledTasks.length,
      slippedCount: evaluation.slippedTasks.length,
    };
  }

  try {
    await db.insert(nudgeEvents).values({
      userId,
      kind: "top3_stall",
      localDate,
      taskIds: evaluation.stalledTasks.map((t) => t.id),
    });
  } catch {
    return {
      fired: false,
      stalledCount: evaluation.stalledTasks.length,
      slippedCount: evaluation.slippedTasks.length,
    };
  }

  const text = await generateNudge(userId, evaluation.stalledTasks, evaluation.slippedTasks);
  const message = await appendAssistantMessage(userId, GLOBAL_THREAD_ID, text, {
    source: "nudge",
    kind: "top3_stall",
  });

  return {
    fired: true,
    messageId: message.id,
    stalledCount: evaluation.stalledTasks.length,
    slippedCount: evaluation.slippedTasks.length,
  };
}

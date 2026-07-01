import "server-only";

import { and, asc, eq, inArray, isNotNull, isNull } from "drizzle-orm";

import { db } from "@/db";
import { nudgeEvents, taskTimeEntries, tasks } from "@/db/tables";
import type { EssentialNudgeChipPayload } from "@/lib/nudges/essential-nudge-types";
import {
  evaluateSelfCareWalk,
  templateSelfCareWalkMessage,
} from "@/lib/nudges/evaluate-self-care-walk";
import { evaluateTop3Stall } from "@/lib/nudges/evaluate-top3-stall";
import { startedOnLocalDay } from "@/lib/nudges/local-time";
import { templateStallChipMessage } from "@/lib/nudges/template-nudge";

export type NudgeEvaluateResult = {
  fired: boolean;
  chips: EssentialNudgeChipPayload[];
  stalledCount: number;
  slippedCount: number;
};

export async function runNudgeEvaluation(params: {
  userId: string;
  localDate: string;
  tzOffsetMinutes: number;
  /** When true, evaluate the self-care walk chip (Today only). */
  includeSelfCare?: boolean;
}): Promise<NudgeEvaluateResult> {
  const { userId, localDate, tzOffsetMinutes, includeSelfCare = false } = params;
  const now = new Date();

  const [top3Rows, existingNudges, timeEntryRows] = await Promise.all([
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
      .select({ kind: nudgeEvents.kind })
      .from(nudgeEvents)
      .where(
        and(
          eq(nudgeEvents.userId, userId),
          eq(nudgeEvents.localDate, localDate),
          inArray(nudgeEvents.kind, ["top3_stall", "self_care_walk"])
        )
      ),
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

  const nudgedKinds = new Set(existingNudges.map((n) => n.kind));

  const stallEvaluation = evaluateTop3Stall({
    now,
    tzOffsetMinutes,
    localDate,
    top3Tasks,
    timeEntriesToday,
    alreadyNudgedToday: nudgedKinds.has("top3_stall"),
  });

  const selfCareEvaluation = includeSelfCare
    ? evaluateSelfCareWalk({
        now,
        tzOffsetMinutes,
        hadFocusTimeToday: timeEntriesToday.length > 0,
        alreadyNudgedToday: nudgedKinds.has("self_care_walk"),
      })
    : { shouldFire: false, localHour: 0 };

  const chips: EssentialNudgeChipPayload[] = [];
  let fired = false;

  if (stallEvaluation.shouldFireStallNudge) {
    try {
      await db.insert(nudgeEvents).values({
        userId,
        kind: "top3_stall",
        localDate,
        taskIds: stallEvaluation.stalledTasks.map((t) => t.id),
      });
      chips.push({
        kind: "top3_stall",
        message: templateStallChipMessage(
          stallEvaluation.stalledTasks,
          stallEvaluation.slippedTasks
        ),
      });
      fired = true;
    } catch {
      // Unique index — another tab won the race.
    }
  }

  if (selfCareEvaluation.shouldFire) {
    try {
      await db.insert(nudgeEvents).values({
        userId,
        kind: "self_care_walk",
        localDate,
        taskIds: [],
      });
      chips.push({
        kind: "self_care_walk",
        message: templateSelfCareWalkMessage(),
      });
      fired = true;
    } catch {
      // Unique index — another tab won the race.
    }
  }

  return {
    fired,
    chips,
    stalledCount: stallEvaluation.stalledTasks.length,
    slippedCount: stallEvaluation.slippedTasks.length,
  };
}

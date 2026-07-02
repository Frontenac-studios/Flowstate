import "server-only";
import { and, asc, eq, gte, inArray, isNotNull, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { nudgeEvents, taskTimeEntries, tasks } from "@/db/tables";
import type { EssentialNudgeChipPayload } from "@/lib/nudges/essential-nudge-types";
import { evaluateBalanceLopsided } from "@/lib/nudges/evaluate-balance-lopsided";
import {
  evaluateMonthlyReview,
  localMonthKey,
  templateMonthlyReviewMessage,
} from "@/lib/nudges/evaluate-monthly-review";
import {
  evaluateSelfCareWalk,
  templateSelfCareWalkMessage,
} from "@/lib/nudges/evaluate-self-care-walk";
import { evaluateTop3Stall } from "@/lib/nudges/evaluate-top3-stall";
import { startedOnLocalDay } from "@/lib/nudges/local-time";
import { templateStallChipMessage } from "@/lib/nudges/template-nudge";
import { fetchBalanceNudgeContext } from "@/server/nudges/fetch-balance-nudge-context";
import { getLatestEvidenceEdition } from "@/server/evidence/generate-edition";
import { fetchIsOverCommittedForDate } from "@/server/week/fetch-over-commit-for-date";
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
  includeSelfCare?: boolean;
  includeMonthlyReview?: boolean;
  includeEvidenceSurface?: boolean;
}): Promise<NudgeEvaluateResult> {
  const {
    userId,
    localDate,
    tzOffsetMinutes,
    includeSelfCare = false,
    includeMonthlyReview = false,
    includeEvidenceSurface = false,
  } = params;
  const now = new Date();
  const monthKey = localMonthKey(now, tzOffsetMinutes);
  const monthStart = `${monthKey}-01`;
  const monthEnd = `${monthKey}-31`;
  const [top3Rows, existingNudges, timeEntryRows, monthlyNudges] = await Promise.all([
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
          inArray(nudgeEvents.kind, [
            "top3_stall",
            "self_care_walk",
            "top3_slip",
            "balance_lopsided",
          ])
        )
      ),
    db
      .select({ taskId: taskTimeEntries.taskId, startedAt: taskTimeEntries.startedAt })
      .from(taskTimeEntries)
      .where(eq(taskTimeEntries.userId, userId)),
    includeMonthlyReview
      ? db
          .select({ kind: nudgeEvents.kind })
          .from(nudgeEvents)
          .where(
            and(
              eq(nudgeEvents.userId, userId),
              eq(nudgeEvents.kind, "monthly_review"),
              gte(nudgeEvents.localDate, monthStart),
              lte(nudgeEvents.localDate, monthEnd)
            )
          )
          .limit(1)
      : Promise.resolve([]),
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
  const allTimeEntries = timeEntryRows.map((e) => ({
    taskId: e.taskId,
    startedAt: e.startedAt,
  }));
  const nudgedKinds = new Set(existingNudges.map((n) => n.kind));
  const stallEvaluation = evaluateTop3Stall({
    now,
    tzOffsetMinutes,
    localDate,
    top3Tasks,
    timeEntriesToday,
    timeEntries: allTimeEntries,
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
  const monthlyEvaluation = includeMonthlyReview
    ? evaluateMonthlyReview({
        now,
        tzOffsetMinutes,
        alreadyNudgedThisMonth: monthlyNudges.length > 0,
      })
    : { shouldFire: false, localHour: 0 };

  const [balanceContext, isOverCommitted] = await Promise.all([
    fetchBalanceNudgeContext(userId),
    fetchIsOverCommittedForDate(userId, localDate, tzOffsetMinutes),
  ]);

  const balanceEvaluation = evaluateBalanceLopsided({
    historicalWeeks: balanceContext.historicalWeeks,
    currentWeek: balanceContext.currentWeek,
    candidate: balanceContext.candidate,
    balanceNudgeEnabled: balanceContext.balanceNudgeEnabled,
    alreadyNudgedToday: nudgedKinds.has("balance_lopsided"),
    isOverCommitted,
  });

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
        klass: "problem",
        priority: 3,
        action: { type: "decide" },
      });
      fired = true;
    } catch {}
  }
  if (stallEvaluation.slippedWithoutProgress.length > 0 && !nudgedKinds.has("top3_slip")) {
    const slip = stallEvaluation.slippedWithoutProgress.sort(
      (a, b) => a.top3Order - b.top3Order
    )[0];
    if (slip) {
      try {
        await db.insert(nudgeEvents).values({
          userId,
          kind: "top3_slip",
          localDate,
          taskIds: [slip.id],
        });
        chips.push({
          kind: "top3_slip",
          message: `'${slip.title}' keeps sliding. Break it down, or let it go?`,
          klass: "problem",
          priority: 0,
          action: { type: "open_top3" },
        });
        fired = true;
      } catch {}
    }
  }
  if (selfCareEvaluation.shouldFire) {
    try {
      await db
        .insert(nudgeEvents)
        .values({ userId, kind: "self_care_walk", localDate, taskIds: [] });
      chips.push({
        kind: "self_care_walk",
        message: templateSelfCareWalkMessage(),
        klass: "problem",
        priority: 3,
        action: { type: "open_care" },
      });
      fired = true;
    } catch {}
  }
  if (monthlyEvaluation.shouldFire) {
    try {
      await db
        .insert(nudgeEvents)
        .values({ userId, kind: "monthly_review", localDate, taskIds: [] });
      chips.push({
        kind: "monthly_review",
        message: templateMonthlyReviewMessage(),
        klass: "reassurance",
        priority: 1,
        action: { type: "open_backlog" },
      });
      fired = true;
    } catch {}
  }
  if (balanceEvaluation.shouldFire && balanceEvaluation.category) {
    try {
      await db.insert(nudgeEvents).values({
        userId,
        kind: "balance_lopsided",
        localDate,
        taskIds: [],
      });
      chips.push({
        kind: "balance_lopsided",
        message: balanceEvaluation.message,
        klass: "problem",
        priority: 1,
        action: balanceEvaluation.action,
        categoryTint: balanceEvaluation.category,
      });
      fired = true;
    } catch {}
  }
  if (includeEvidenceSurface && !nudgedKinds.has("evidence_surface")) {
    const latest = await getLatestEvidenceEdition(userId);
    if (latest?.state === "unseen" && latest.kind === "milestone") {
      try {
        await db.insert(nudgeEvents).values({
          userId,
          kind: "evidence_surface",
          localDate,
          taskIds: [],
        });
        chips.push({
          kind: "evidence_surface",
          message: "You closed something big. Here's the trail that got you here.",
          klass: "reassurance",
          priority: 0,
          action: { type: "open_care_wins" },
        });
        fired = true;
      } catch {}
    }
  }
  return {
    fired,
    chips,
    stalledCount: stallEvaluation.stalledTasks.length,
    slippedCount: stallEvaluation.slippedTasks.length,
  };
}

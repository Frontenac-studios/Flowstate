import "server-only";
import { and, asc, eq, gte, inArray, isNotNull, isNull, lte, lt } from "drizzle-orm";
import { db } from "@/db";
import {
  appSettings,
  careActivities,
  careEvents,
  careReflections,
  focusBlocks,
  nudgeEvents,
  taskTimeEntries,
  tasks,
} from "@/db/tables";
import type { EssentialNudgeChipPayload } from "@/lib/nudges/essential-nudge-types";
import { evaluateBalanceLopsided } from "@/lib/nudges/evaluate-balance-lopsided";
import {
  evaluateMonthlyReview,
  localMonthKey,
  templateMonthlyReviewMessage,
} from "@/lib/nudges/evaluate-monthly-review";
import { evaluateLiftsMeNudge } from "@/lib/nudges/evaluate-lifts-me-nudge";
import {
  evaluateSelfCareWalkReminders,
  SELF_CARE_WALK_REMINDER_KINDS,
} from "@/lib/nudges/evaluate-self-care-walk-reminders";
import { evaluateStressBreathing } from "@/lib/nudges/evaluate-stress-breathing";
import { evaluateTop3Stall } from "@/lib/nudges/evaluate-top3-stall";
import { longestFocusSegmentMinutes } from "@/lib/nudges/focus-segments";
import { getLocalMinutes, startedOnLocalDay } from "@/lib/nudges/local-time";
import { startOfLocalDay, toISODateString } from "@/lib/dates/local-day";
import { templateStallChipMessage } from "@/lib/nudges/template-nudge";
import { evaluateGoalSteering } from "@/lib/nudges/evaluate-goal-steering";
import { PROBLEM_NUDGE_PRIORITY, REASSURANCE_NUDGE_PRIORITY } from "@/lib/nudges/nudge-arbiter";
import { deriveLiftsMe } from "@/lib/care/lifts-me";
import { goalSteeringNudgeTaskIds } from "@/lib/planning/goal-steering-rotation";
import { DEFAULT_DAY_END_HOUR, DEFAULT_DAY_START_HOUR } from "@/lib/settings/constants";
import { fetchBalanceNudgeContext } from "@/server/nudges/fetch-balance-nudge-context";
import { fetchGoalSteeringOffer } from "@/server/planning/fetch-goal-steering-offer";
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
            ...SELF_CARE_WALK_REMINDER_KINDS,
            "self_care_breathe_stress",
            "self_care_lifts_me",
            "top3_slip",
            "balance_lopsided",
            "goal_step",
          ])
        )
      ),
    db
      .select({
        taskId: taskTimeEntries.taskId,
        startedAt: taskTimeEntries.startedAt,
        endedAt: taskTimeEntries.endedAt,
      })
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
    ? await (async () => {
        const rangeStartMin = DEFAULT_DAY_START_HOUR * 60;
        const rangeEndMin = DEFAULT_DAY_END_HOUR * 60;
        const nowMin = getLocalMinutes(now, tzOffsetMinutes);
        const threeDaysAgoIso = toISODateString(
          (() => {
            const d = startOfLocalDay(now);
            d.setDate(d.getDate() - 3);
            return d;
          })()
        );
        const liftsWindowStart = new Date(now);
        liftsWindowStart.setDate(liftsWindowStart.getDate() - 30);

        const [
          blockRows,
          incompleteTodayRows,
          overdueRows,
          reflectionRows,
          careActivityRows,
          careEventRows,
        ] = await Promise.all([
          db
            .select({ startMin: focusBlocks.startMin, endMin: focusBlocks.endMin })
            .from(focusBlocks)
            .where(and(eq(focusBlocks.userId, userId), eq(focusBlocks.date, localDate))),
          db
            .select({ id: tasks.id })
            .from(tasks)
            .where(
              and(
                eq(tasks.userId, userId),
                eq(tasks.scheduledDate, localDate),
                isNull(tasks.completedAt)
              )
            ),
          db
            .select({ id: tasks.id })
            .from(tasks)
            .where(
              and(
                eq(tasks.userId, userId),
                isNull(tasks.completedAt),
                isNotNull(tasks.scheduledDate),
                lt(tasks.scheduledDate, localDate)
              )
            ),
          db
            .select({ mood: careReflections.mood, reflectionDate: careReflections.reflectionDate })
            .from(careReflections)
            .where(
              and(
                eq(careReflections.userId, userId),
                gte(careReflections.reflectionDate, threeDaysAgoIso)
              )
            )
            .orderBy(asc(careReflections.reflectionDate)),
          db
            .select({
              id: careActivities.id,
              title: careActivities.title,
              liftsMe: careActivities.liftsMe,
            })
            .from(careActivities)
            .where(and(eq(careActivities.userId, userId), isNull(careActivities.archivedAt))),
          db
            .select({ activityId: careEvents.activityId, occurredAt: careEvents.occurredAt })
            .from(careEvents)
            .where(
              and(eq(careEvents.userId, userId), gte(careEvents.occurredAt, liftsWindowStart))
            ),
        ]);

        const busyIntervals = blockRows.map((b) => ({
          startMin: b.startMin,
          endMin: b.endMin,
        }));
        const walkReminders = evaluateSelfCareWalkReminders({
          now,
          tzOffsetMinutes,
          busyIntervals,
          rangeStartMin,
          rangeEndMin,
          nowMin,
          hadFocusTimeToday: timeEntriesToday.length > 0,
          nudgedKindsToday: nudgedKinds,
        });
        const recentMood = reflectionRows.filter((r) => r.mood != null).at(-1)?.mood ?? null;
        const stressBreathing = evaluateStressBreathing({
          longestFocusSegmentMin: longestFocusSegmentMinutes(timeEntryRows, now),
          incompleteTodayCount: incompleteTodayRows.length,
          overdueCount: overdueRows.length,
          recentMood,
          alreadyNudgedToday: nudgedKinds.has("self_care_breathe_stress"),
        });
        const liftsPractices = deriveLiftsMe({
          activities: careActivityRows,
          events: careEventRows,
        });
        const lastOccurredAt = new Map<string, Date>();
        for (const event of careEventRows) {
          if (!event.activityId) continue;
          const prev = lastOccurredAt.get(event.activityId);
          if (!prev || event.occurredAt > prev) {
            lastOccurredAt.set(event.activityId, event.occurredAt);
          }
        }
        const liftsMe = evaluateLiftsMeNudge({
          practices: liftsPractices,
          lastOccurredAt,
          now,
          alreadyNudgedToday: nudgedKinds.has("self_care_lifts_me"),
        });

        return { walkReminders, stressBreathing, liftsMe };
      })()
    : null;
  const monthlyEvaluation = includeMonthlyReview
    ? evaluateMonthlyReview({
        now,
        tzOffsetMinutes,
        alreadyNudgedThisMonth: monthlyNudges.length > 0,
      })
    : { shouldFire: false, localHour: 0 };

  const [balanceContext, isOverCommitted, goalSteeringOffer, settingsRow] = await Promise.all([
    fetchBalanceNudgeContext(userId),
    fetchIsOverCommittedForDate(userId, localDate, tzOffsetMinutes),
    fetchGoalSteeringOffer(userId),
    db
      .select({
        goalSteering: appSettings.goalSteering,
        assistanceEnabled: appSettings.assistanceEnabled,
      })
      .from(appSettings)
      .where(eq(appSettings.userId, userId))
      .limit(1),
  ]);
  const goalSteeringEnabled =
    (settingsRow[0]?.assistanceEnabled ?? true) && (settingsRow[0]?.goalSteering ?? "on") === "on";

  const balanceEvaluation = evaluateBalanceLopsided({
    historicalWeeks: balanceContext.historicalWeeks,
    currentWeek: balanceContext.currentWeek,
    candidate: balanceContext.candidate,
    balanceNudgeEnabled: balanceContext.balanceNudgeEnabled,
    alreadyNudgedToday: nudgedKinds.has("balance_lopsided"),
    isOverCommitted,
  });

  const goalSteeringEvaluation = evaluateGoalSteering({
    offer: goalSteeringOffer,
    goalSteeringEnabled,
    alreadyNudgedToday: nudgedKinds.has("goal_step"),
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
        priority: PROBLEM_NUDGE_PRIORITY.top3_stall,
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
          priority: PROBLEM_NUDGE_PRIORITY.top3_slip,
          action: { type: "open_top3" },
        });
        fired = true;
      } catch {}
    }
  }
  if (selfCareEvaluation) {
    for (const reminder of selfCareEvaluation.walkReminders) {
      if (!reminder.shouldFire) continue;
      try {
        await db.insert(nudgeEvents).values({
          userId,
          kind: reminder.kind,
          localDate,
          taskIds: [],
        });
        chips.push({
          kind: reminder.kind,
          message: reminder.message,
          klass: "reassurance",
          priority: REASSURANCE_NUDGE_PRIORITY.self_care_walk,
          action: { type: "start_walk" },
        });
        fired = true;
      } catch {}
    }
    if (selfCareEvaluation.stressBreathing.shouldFire) {
      try {
        await db
          .insert(nudgeEvents)
          .values({ userId, kind: "self_care_breathe_stress", localDate, taskIds: [] });
        chips.push({
          kind: "self_care_breathe_stress",
          message: selfCareEvaluation.stressBreathing.message,
          klass: "reassurance",
          priority: REASSURANCE_NUDGE_PRIORITY.self_care_breathe_stress,
          action: { type: "start_breathe" },
        });
        fired = true;
      } catch {}
    }
    if (selfCareEvaluation.liftsMe.shouldFire) {
      try {
        await db.insert(nudgeEvents).values({
          userId,
          kind: "self_care_lifts_me",
          localDate,
          taskIds: selfCareEvaluation.liftsMe.activityId
            ? [selfCareEvaluation.liftsMe.activityId]
            : [],
        });
        chips.push({
          kind: "self_care_lifts_me",
          message: selfCareEvaluation.liftsMe.message,
          klass: "reassurance",
          priority: REASSURANCE_NUDGE_PRIORITY.self_care_lifts_me,
          action: { type: "start_walk" },
        });
        fired = true;
      } catch {}
    }
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
        priority: PROBLEM_NUDGE_PRIORITY.balance_lopsided,
        action: balanceEvaluation.action,
        categoryTint: balanceEvaluation.category,
      });
      fired = true;
    } catch {}
  }
  if (goalSteeringEvaluation.shouldFire && goalSteeringEvaluation.offer) {
    try {
      await db.insert(nudgeEvents).values({
        userId,
        kind: "goal_step",
        localDate,
        taskIds: goalSteeringNudgeTaskIds(goalSteeringEvaluation.offer.goalId),
      });
      chips.push({
        kind: "goal_step",
        message: goalSteeringEvaluation.message,
        klass: "problem",
        priority: PROBLEM_NUDGE_PRIORITY.goal_step,
        action: {
          type: "goal_step_add",
          payload: JSON.stringify(goalSteeringEvaluation.offer),
        },
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

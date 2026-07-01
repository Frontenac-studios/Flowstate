import "server-only";

import { and, eq, gte, inArray, isNotNull, lt } from "drizzle-orm";

import { db } from "@/db";
import {
  abyssItems,
  careActivities,
  careEvents,
  dailyWins,
  goalMilestones,
  tasks,
} from "@/db/tables";
import { buildWinCandidates } from "@/lib/daily-wins/build-candidates";
import { rankProposals } from "@/lib/daily-wins/rank-proposals";
import type { WinProposal } from "@/lib/daily-wins/types";
import { localDayUtcBounds } from "@/lib/eod/local-day-bounds";

export async function fetchDailyWinProposals(
  userId: string,
  winDate: string,
  tzOffsetMinutes: number
): Promise<WinProposal[]> {
  const { start, end } = localDayUtcBounds(winDate, tzOffsetMinutes);

  const [completedTasks, events, stored] = await Promise.all([
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        isTop3: tasks.isTop3,
        top3Order: tasks.top3Order,
        priority: tasks.priority,
        timeEstimateMinutes: tasks.timeEstimateMinutes,
        completedAt: tasks.completedAt,
        milestoneId: tasks.milestoneId,
        milestoneTitle: goalMilestones.title,
      })
      .from(tasks)
      .leftJoin(goalMilestones, eq(tasks.milestoneId, goalMilestones.id))
      .where(
        and(
          eq(tasks.userId, userId),
          isNotNull(tasks.completedAt),
          gte(tasks.completedAt, start),
          lt(tasks.completedAt, end)
        )
      ),
    db
      .select({
        id: careEvents.id,
        occurredAt: careEvents.occurredAt,
        activityTitle: careActivities.title,
      })
      .from(careEvents)
      .leftJoin(careActivities, eq(careEvents.activityId, careActivities.id))
      .where(
        and(
          eq(careEvents.userId, userId),
          gte(careEvents.occurredAt, start),
          lt(careEvents.occurredAt, end)
        )
      ),
    db
      .select({
        refId: dailyWins.refId,
        state: dailyWins.state,
      })
      .from(dailyWins)
      .where(and(eq(dailyWins.userId, userId), eq(dailyWins.winDate, winDate))),
  ]);

  const completedTaskIds = completedTasks.map((t) => t.id).filter((id): id is string => id != null);

  const abyssRows =
    completedTaskIds.length > 0
      ? await db
          .select({
            id: abyssItems.id,
            title: abyssItems.title,
            promotedTaskId: abyssItems.promotedTaskId,
          })
          .from(abyssItems)
          .where(
            and(eq(abyssItems.userId, userId), inArray(abyssItems.promotedTaskId, completedTaskIds))
          )
      : [];

  const completedAtByTaskId = new Map(
    completedTasks.filter((t) => t.completedAt != null).map((t) => [t.id, t.completedAt as Date])
  );

  const dismissedRefIds = new Set(
    stored.filter((row) => row.state === "dismissed" && row.refId).map((row) => row.refId as string)
  );
  const acceptedRefIds = new Set(
    stored.filter((row) => row.state === "accepted" && row.refId).map((row) => row.refId as string)
  );

  const candidates = buildWinCandidates({
    tasks: completedTasks
      .filter((t) => t.completedAt != null)
      .map((t) => ({
        id: t.id,
        title: t.title,
        isTop3: t.isTop3,
        top3Order: t.top3Order,
        priority: t.priority,
        timeEstimateMinutes: t.timeEstimateMinutes,
        completedAt: t.completedAt as Date,
        milestoneId: t.milestoneId,
        milestoneTitle: t.milestoneTitle,
      })),
    careEvents: events.map((e) => ({
      id: e.id,
      label: e.activityTitle?.trim() || "Care practice",
      occurredAt: e.occurredAt,
    })),
    abyssActions: abyssRows
      .map((row) => {
        const occurredAt = row.promotedTaskId
          ? completedAtByTaskId.get(row.promotedTaskId)
          : undefined;
        if (!occurredAt) return null;
        return {
          id: row.id,
          title: row.title,
          occurredAt,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null),
  });

  return rankProposals(candidates, { dismissedRefIds, acceptedRefIds });
}

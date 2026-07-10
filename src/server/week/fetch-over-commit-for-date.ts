import "server-only";

import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";

import { db } from "@/db";
import { protectedBlocks, tasks, weekDayPriorities } from "@/db/tables";
import { isTop3ActiveForLocalDate } from "@/lib/tasks/top3-local-day";
import { computeDayLoad } from "@/lib/week/day-load";
import { fetchOverCommitThreshold } from "@/server/week/fetch-over-commit-threshold";
import { isDayOverCommitted } from "@/lib/week/over-commit-threshold";
import { fetchExternalCalendarLoadWeight } from "@/server/calendar/fetch-calendar-day-load";

export async function fetchIsOverCommittedForDate(
  userId: string,
  date: string,
  tzOffsetMinutes: number
): Promise<boolean> {
  const threshold = await fetchOverCommitThreshold(userId);

  const [scheduledTasks, priorityRows, protectedRows, top3Rows, calendarLoadWeight] =
    await Promise.all([
      db
        .select({ id: tasks.id })
        .from(tasks)
        .where(
          and(eq(tasks.userId, userId), eq(tasks.scheduledDate, date), isNull(tasks.completedAt))
        ),
      db
        .select({ taskId: weekDayPriorities.taskId })
        .from(weekDayPriorities)
        .where(
          and(eq(weekDayPriorities.userId, userId), eq(weekDayPriorities.scheduledDate, date))
        ),
      db
        .select({ id: protectedBlocks.id })
        .from(protectedBlocks)
        .where(
          and(
            eq(protectedBlocks.userId, userId),
            eq(protectedBlocks.scheduledDate, date),
            inArray(protectedBlocks.status, ["confirmed", "proposed"])
          )
        ),
      db
        .select({
          id: tasks.id,
          top3PinnedAt: tasks.top3PinnedAt,
          scheduledDate: tasks.scheduledDate,
        })
        .from(tasks)
        .where(and(eq(tasks.userId, userId), eq(tasks.isTop3, true), isNotNull(tasks.top3Order))),
      fetchExternalCalendarLoadWeight(userId, date, tzOffsetMinutes),
    ]);

  const priorityIds = new Set(priorityRows.map((r) => r.taskId));
  for (const row of top3Rows) {
    if (
      isTop3ActiveForLocalDate(
        { top3PinnedAt: row.top3PinnedAt, scheduledDate: row.scheduledDate },
        date,
        tzOffsetMinutes
      )
    ) {
      priorityIds.add(row.id);
    }
  }

  const taskIds = new Set(scheduledTasks.map((t) => t.id));
  Array.from(priorityIds).forEach((id) => taskIds.add(id));

  const load = computeDayLoad(
    Array.from(taskIds).map((id) => ({ id })),
    priorityIds,
    protectedRows.length,
    undefined,
    calendarLoadWeight
  );

  return isDayOverCommitted(load, threshold.threshold);
}

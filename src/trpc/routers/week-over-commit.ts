import { and, eq, gte, inArray, isNotNull, isNull, lt } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { protectedBlocks, tasks, weekDayPriorities } from "@/db/tables";
import {
  addDays,
  parseISODateString,
  startOfIsoWeekMonday,
  toISODateString,
} from "@/lib/dates/local-day";
import { isTop3ActiveForLocalDate } from "@/lib/tasks/top3-local-day";
import { computeDayLoad } from "@/lib/week/day-load";
import {
  isDayOverCommitted,
  LEARNED_LOOKBACK_WEEKS,
  resolveOverCommitThreshold,
  type OverCommitThreshold,
} from "@/lib/week/over-commit-threshold";

import { createTRPCRouter, protectedProcedure } from "../init";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function isoWeekKey(isoDate: string): string {
  return toISODateString(startOfIsoWeekMonday(parseISODateString(isoDate)));
}

function countWeeksWithActivity(dates: Iterable<string>): number {
  const weeks = new Set<string>();
  Array.from(dates).forEach((iso) => {
    weeks.add(isoWeekKey(iso));
  });
  return weeks.size;
}

function buildHistoricalDailyLoads(input: {
  taskRows: { id: string; scheduledDate: string }[];
  priorityRows: { taskId: string; scheduledDate: string }[];
  protectedRows: { scheduledDate: string }[];
}): number[] {
  const tasksByDate = new Map<string, { id: string }[]>();
  const prioritiesByDate = new Map<string, Set<string>>();
  const protectedByDate = new Map<string, number>();

  for (const row of input.taskRows) {
    const list = tasksByDate.get(row.scheduledDate) ?? [];
    list.push({ id: row.id });
    tasksByDate.set(row.scheduledDate, list);
  }

  for (const row of input.priorityRows) {
    const set = prioritiesByDate.get(row.scheduledDate) ?? new Set<string>();
    set.add(row.taskId);
    prioritiesByDate.set(row.scheduledDate, set);
  }

  for (const row of input.protectedRows) {
    protectedByDate.set(row.scheduledDate, (protectedByDate.get(row.scheduledDate) ?? 0) + 1);
  }

  const dates = new Set<string>([
    ...Array.from(tasksByDate.keys()),
    ...Array.from(prioritiesByDate.keys()),
    ...Array.from(protectedByDate.keys()),
  ]);

  return Array.from(dates).map((iso) =>
    computeDayLoad(
      tasksByDate.get(iso) ?? [],
      prioritiesByDate.get(iso) ?? new Set(),
      protectedByDate.get(iso) ?? 0
    )
  );
}

async function fetchOverCommitThreshold(userId: string): Promise<OverCommitThreshold> {
  const todayIso = toISODateString(new Date());
  const lookbackStart = toISODateString(
    addDays(parseISODateString(todayIso), -(LEARNED_LOOKBACK_WEEKS * 7))
  );

  const [taskRows, priorityRows, protectedRows] = await Promise.all([
    db
      .select({ id: tasks.id, scheduledDate: tasks.scheduledDate })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          isNotNull(tasks.scheduledDate),
          gte(tasks.scheduledDate, lookbackStart),
          lt(tasks.scheduledDate, todayIso)
        )
      ),
    db
      .select({
        taskId: weekDayPriorities.taskId,
        scheduledDate: weekDayPriorities.scheduledDate,
      })
      .from(weekDayPriorities)
      .where(
        and(
          eq(weekDayPriorities.userId, userId),
          gte(weekDayPriorities.scheduledDate, lookbackStart),
          lt(weekDayPriorities.scheduledDate, todayIso)
        )
      ),
    db
      .select({ scheduledDate: protectedBlocks.scheduledDate })
      .from(protectedBlocks)
      .where(
        and(
          eq(protectedBlocks.userId, userId),
          gte(protectedBlocks.scheduledDate, lookbackStart),
          lt(protectedBlocks.scheduledDate, todayIso)
        )
      ),
  ]);

  const historicalDailyLoads = buildHistoricalDailyLoads({
    taskRows: taskRows.filter(
      (row): row is { id: string; scheduledDate: string } => row.scheduledDate != null
    ),
    priorityRows,
    protectedRows,
  });

  const activityDates = new Set<string>();
  for (const row of taskRows) {
    if (row.scheduledDate) activityDates.add(row.scheduledDate);
  }
  for (const row of priorityRows) activityDates.add(row.scheduledDate);
  for (const row of protectedRows) activityDates.add(row.scheduledDate);

  return resolveOverCommitThreshold(historicalDailyLoads, countWeeksWithActivity(activityDates));
}

export const weekOverCommitRouter = createTRPCRouter({
  getThreshold: protectedProcedure.query(async ({ ctx }): Promise<OverCommitThreshold> => {
    return fetchOverCommitThreshold(ctx.userId);
  }),

  isOverCommittedForDate: protectedProcedure
    .input(
      z.object({
        date: isoDateSchema,
        tzOffsetMinutes: z.number().int().min(-840).max(840),
      })
    )
    .query(async ({ ctx, input }) => {
      const threshold = await fetchOverCommitThreshold(ctx.userId);

      const [scheduledTasks, priorityRows, protectedRows, top3Rows] = await Promise.all([
        db
          .select({ id: tasks.id })
          .from(tasks)
          .where(
            and(
              eq(tasks.userId, ctx.userId),
              eq(tasks.scheduledDate, input.date),
              isNull(tasks.completedAt)
            )
          ),
        db
          .select({ taskId: weekDayPriorities.taskId })
          .from(weekDayPriorities)
          .where(
            and(
              eq(weekDayPriorities.userId, ctx.userId),
              eq(weekDayPriorities.scheduledDate, input.date)
            )
          ),
        db
          .select({ id: protectedBlocks.id })
          .from(protectedBlocks)
          .where(
            and(
              eq(protectedBlocks.userId, ctx.userId),
              eq(protectedBlocks.scheduledDate, input.date),
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
          .where(
            and(eq(tasks.userId, ctx.userId), eq(tasks.isTop3, true), isNotNull(tasks.top3Order))
          ),
      ]);

      const priorityIds = new Set(priorityRows.map((r) => r.taskId));
      for (const row of top3Rows) {
        if (
          isTop3ActiveForLocalDate(
            {
              top3PinnedAt: row.top3PinnedAt,
              scheduledDate: row.scheduledDate,
            },
            input.date,
            input.tzOffsetMinutes
          )
        ) {
          priorityIds.add(row.id);
        }
      }

      const taskIds = new Set(scheduledTasks.map((t) => t.id));
      Array.from(priorityIds).forEach((id) => {
        taskIds.add(id);
      });

      const load = computeDayLoad(
        Array.from(taskIds).map((id) => ({ id })),
        priorityIds,
        protectedRows.length
      );

      return {
        overCommitted: isDayOverCommitted(load, threshold.threshold),
        load,
        threshold: threshold.threshold,
      };
    }),
});

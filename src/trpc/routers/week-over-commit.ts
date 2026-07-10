import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { protectedBlocks, tasks, weekDayPriorities } from "@/db/tables";
import { isTop3ActiveForLocalDate } from "@/lib/tasks/top3-local-day";
import { computeDayLoad } from "@/lib/week/day-load";
import { isDayOverCommitted } from "@/lib/week/over-commit-threshold";
import { fetchIsOverCommittedForDate } from "@/server/week/fetch-over-commit-for-date";
import { fetchOverCommitThreshold } from "@/server/week/fetch-over-commit-threshold";
import { fetchExternalCalendarLoadWeight } from "@/server/calendar/fetch-calendar-day-load";

import { createTRPCRouter, protectedProcedure } from "../init";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const weekOverCommitRouter = createTRPCRouter({
  getThreshold: protectedProcedure
    .input(
      z
        .object({
          tzOffsetMinutes: z.number().int().min(-840).max(840),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return fetchOverCommitThreshold(ctx.userId, input?.tzOffsetMinutes ?? 0);
    }),

  isOverCommittedForDate: protectedProcedure
    .input(
      z.object({
        date: isoDateSchema,
        tzOffsetMinutes: z.number().int().min(-840).max(840),
      })
    )
    .query(async ({ ctx, input }) => {
      const threshold = await fetchOverCommitThreshold(ctx.userId, input.tzOffsetMinutes);

      const [scheduledTasks, priorityRows, protectedRows, top3Rows, calendarLoadWeight] =
        await Promise.all([
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
          fetchExternalCalendarLoadWeight(ctx.userId, input.date, input.tzOffsetMinutes),
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
      Array.from(priorityIds).forEach((id) => taskIds.add(id));

      const load = computeDayLoad(
        Array.from(taskIds).map((id) => ({ id })),
        priorityIds,
        protectedRows.length,
        undefined,
        calendarLoadWeight
      );

      return {
        overCommitted: isDayOverCommitted(load, threshold.threshold),
        load,
        threshold: threshold.threshold,
      };
    }),

  /** Convenience wrapper used by assurance hooks. */
  isOverCommitted: protectedProcedure
    .input(
      z.object({
        date: isoDateSchema,
        tzOffsetMinutes: z.number().int().min(-840).max(840),
      })
    )
    .query(async ({ ctx, input }) => {
      const overCommitted = await fetchIsOverCommittedForDate(
        ctx.userId,
        input.date,
        input.tzOffsetMinutes
      );
      return { overCommitted };
    }),
});

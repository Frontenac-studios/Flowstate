import { and, asc, eq, gte, lte, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { syncWeekDayPriorityRow } from "@/db/record-sync-mutation";
import { projects, tasks, weekDayPriorities } from "@/db/tables";
import { datesInIsoWeek, parseISODateString, toISODateString } from "@/lib/dates/local-day";

import { createTRPCRouter, protectedProcedure } from "../init";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const prioritySlotSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

function weekDateRange(anchorDate: string): { start: string; end: string } {
  const ref = parseISODateString(anchorDate);
  const dates = datesInIsoWeek(ref).map(toISODateString);
  return { start: dates[0]!, end: dates[dates.length - 1]! };
}

async function getOwnedTask(userId: string, taskId: string) {
  const [row] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1);

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Task not found." });
  }

  return row;
}

/** Drop day-priority rows when a task leaves its pinned day (e.g. reschedule). */
export async function clearWeekDayPrioritiesForTask(
  userId: string,
  taskId: string,
  options?: { exceptDate?: string }
): Promise<void> {
  const conditions = [eq(weekDayPriorities.userId, userId), eq(weekDayPriorities.taskId, taskId)];
  if (options?.exceptDate) {
    conditions.push(ne(weekDayPriorities.scheduledDate, options.exceptDate));
  }

  const removed = await db
    .delete(weekDayPriorities)
    .where(and(...conditions))
    .returning({ id: weekDayPriorities.id });

  for (const row of removed) {
    await syncWeekDayPriorityRow(row.id, "delete", { id: row.id });
  }
}

export const weekDayPrioritiesRouter = createTRPCRouter({
  listPinnedTaskIds: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select({ taskId: weekDayPriorities.taskId })
      .from(weekDayPriorities)
      .where(eq(weekDayPriorities.userId, ctx.userId));
    return rows.map((row) => row.taskId);
  }),

  listForWeek: protectedProcedure
    .input(z.object({ anchorDate: isoDateSchema }))
    .query(async ({ ctx, input }) => {
      const { start, end } = weekDateRange(input.anchorDate);

      return db
        .select({
          id: weekDayPriorities.id,
          taskId: weekDayPriorities.taskId,
          scheduledDate: weekDayPriorities.scheduledDate,
          priorityOrder: weekDayPriorities.priorityOrder,
          title: tasks.title,
          projectId: tasks.projectId,
          projectSlug: projects.slug,
          completedAt: tasks.completedAt,
        })
        .from(weekDayPriorities)
        .innerJoin(tasks, eq(weekDayPriorities.taskId, tasks.id))
        .leftJoin(projects, eq(tasks.projectId, projects.id))
        .where(
          and(
            eq(weekDayPriorities.userId, ctx.userId),
            gte(weekDayPriorities.scheduledDate, start),
            lte(weekDayPriorities.scheduledDate, end)
          )
        )
        .orderBy(asc(weekDayPriorities.scheduledDate), asc(weekDayPriorities.priorityOrder));
    }),

  pin: protectedProcedure
    .input(
      z.object({
        taskId: z.string().uuid(),
        scheduledDate: isoDateSchema,
        slot: prioritySlotSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const task = await getOwnedTask(ctx.userId, input.taskId);

      if (task.scheduledDate !== input.scheduledDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Task must be scheduled on this day to pin as a priority.",
        });
      }

      const now = new Date();

      const clearedSlots = await db
        .delete(weekDayPriorities)
        .where(
          and(
            eq(weekDayPriorities.userId, ctx.userId),
            eq(weekDayPriorities.scheduledDate, input.scheduledDate),
            eq(weekDayPriorities.priorityOrder, input.slot),
            ne(weekDayPriorities.taskId, input.taskId)
          )
        )
        .returning({ id: weekDayPriorities.id });

      for (const row of clearedSlots) {
        await syncWeekDayPriorityRow(row.id, "delete", { id: row.id });
      }

      const clearedTask = await db
        .delete(weekDayPriorities)
        .where(
          and(
            eq(weekDayPriorities.userId, ctx.userId),
            eq(weekDayPriorities.taskId, input.taskId),
            eq(weekDayPriorities.scheduledDate, input.scheduledDate),
            ne(weekDayPriorities.priorityOrder, input.slot)
          )
        )
        .returning({ id: weekDayPriorities.id });

      for (const row of clearedTask) {
        await syncWeekDayPriorityRow(row.id, "delete", { id: row.id });
      }

      const [existing] = await db
        .select({ id: weekDayPriorities.id })
        .from(weekDayPriorities)
        .where(
          and(
            eq(weekDayPriorities.userId, ctx.userId),
            eq(weekDayPriorities.taskId, input.taskId),
            eq(weekDayPriorities.scheduledDate, input.scheduledDate)
          )
        )
        .limit(1);

      let rowId: string;

      if (existing) {
        const [updated] = await db
          .update(weekDayPriorities)
          .set({ priorityOrder: input.slot, updatedAt: now })
          .where(eq(weekDayPriorities.id, existing.id))
          .returning();
        if (!updated) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to pin priority.",
          });
        }
        rowId = updated.id;
        await syncWeekDayPriorityRow(rowId, "update", updated);
        return updated;
      }

      const [inserted] = await db
        .insert(weekDayPriorities)
        .values({
          userId: ctx.userId,
          taskId: input.taskId,
          scheduledDate: input.scheduledDate,
          priorityOrder: input.slot,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!inserted) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to pin priority." });
      }

      rowId = inserted.id;
      await syncWeekDayPriorityRow(rowId, "insert", inserted);
      return inserted;
    }),

  unpin: protectedProcedure
    .input(
      z.object({
        taskId: z.string().uuid(),
        scheduledDate: isoDateSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      await getOwnedTask(ctx.userId, input.taskId);

      const [removed] = await db
        .delete(weekDayPriorities)
        .where(
          and(
            eq(weekDayPriorities.userId, ctx.userId),
            eq(weekDayPriorities.taskId, input.taskId),
            eq(weekDayPriorities.scheduledDate, input.scheduledDate)
          )
        )
        .returning();

      if (!removed) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Priority not found." });
      }

      await syncWeekDayPriorityRow(removed.id, "delete", { id: removed.id });
      return removed;
    }),
});

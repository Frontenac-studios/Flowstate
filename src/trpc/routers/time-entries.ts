import { and, desc, eq, gte, isNotNull, isNull, lt } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { projects, taskTimeEntries, tasks } from "@/db/tables";
import { aggregateWeek } from "@/lib/time/aggregate-week";
import { localWeekUtcBounds } from "@/lib/time/local-week-bounds";

import { createTRPCRouter, protectedProcedure } from "../init";

/** Manual entries can't exceed a day — guards against fat-fingered windows. */
const MAX_ENTRY_SECONDS = 24 * 60 * 60;

const manualWindow = z
  .object({ startedAt: z.coerce.date(), endedAt: z.coerce.date() })
  .refine((w) => w.endedAt.getTime() > w.startedAt.getTime(), {
    message: "End must be after start.",
  })
  .refine((w) => w.endedAt.getTime() - w.startedAt.getTime() <= MAX_ENTRY_SECONDS * 1000, {
    message: "Entry can't be longer than 24 hours.",
  });

/** Confirm the task exists and belongs to the caller (RLS belt-and-braces). */
async function assertOwnsTask(taskId: string, userId: string) {
  const [task] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1);
  if (!task) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Task not found." });
  }
}

export const timeEntriesRouter = createTRPCRouter({
  start: protectedProcedure
    .input(z.object({ taskId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [task] = await db
        .select()
        .from(tasks)
        .where(
          and(eq(tasks.id, input.taskId), eq(tasks.userId, ctx.userId), isNull(tasks.completedAt))
        )
        .limit(1);

      if (!task) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Task not found or already completed.",
        });
      }

      const startedAt = new Date();
      const reason = "start";

      const [row] = await db
        .insert(taskTimeEntries)
        .values({
          userId: ctx.userId,
          taskId: input.taskId,
          startedAt,
          endedAt: null,
          reason,
        })
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to start time entry.",
        });
      }

      return { entryId: row.id };
    }),

  end: protectedProcedure
    .input(z.object({ entryId: z.string().uuid(), reason: z.enum(["done", "park", "esc"]) }))
    .mutation(async ({ ctx, input }) => {
      const endedAt = new Date();

      const [row] = await db
        .update(taskTimeEntries)
        .set({ endedAt, reason: input.reason })
        .where(
          and(
            eq(taskTimeEntries.id, input.entryId),
            eq(taskTimeEntries.userId, ctx.userId),
            isNull(taskTimeEntries.endedAt)
          )
        )
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Time entry not found or already ended.",
        });
      }

      return { entryId: row.id };
    }),

  /** Completed entries for a task, newest first — powers the manual-entry list. */
  listForTask: protectedProcedure
    .input(z.object({ taskId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await db
        .select({
          id: taskTimeEntries.id,
          startedAt: taskTimeEntries.startedAt,
          endedAt: taskTimeEntries.endedAt,
          reason: taskTimeEntries.reason,
        })
        .from(taskTimeEntries)
        .where(
          and(
            eq(taskTimeEntries.userId, ctx.userId),
            eq(taskTimeEntries.taskId, input.taskId),
            isNotNull(taskTimeEntries.endedAt)
          )
        )
        .orderBy(desc(taskTimeEntries.startedAt))
        .limit(50);

      return rows;
    }),

  /** Add a time block by hand (reason "manual"); works on any task. */
  create: protectedProcedure
    .input(z.object({ taskId: z.string().uuid() }).and(manualWindow))
    .mutation(async ({ ctx, input }) => {
      await assertOwnsTask(input.taskId, ctx.userId);

      const [row] = await db
        .insert(taskTimeEntries)
        .values({
          userId: ctx.userId,
          taskId: input.taskId,
          startedAt: input.startedAt,
          endedAt: input.endedAt,
          reason: "manual",
        })
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create time entry.",
        });
      }

      return { entryId: row.id };
    }),

  /** Edit an existing entry's window. Touches updatedAt so sync resolves it. */
  update: protectedProcedure
    .input(z.object({ entryId: z.string().uuid() }).and(manualWindow))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .update(taskTimeEntries)
        .set({ startedAt: input.startedAt, endedAt: input.endedAt, updatedAt: new Date() })
        .where(
          and(
            eq(taskTimeEntries.id, input.entryId),
            eq(taskTimeEntries.userId, ctx.userId),
            isNotNull(taskTimeEntries.endedAt)
          )
        )
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Time entry not found or still running.",
        });
      }

      return { entryId: row.id };
    }),

  /**
   * End-of-week roll-up (Phase 2.5): focus seconds for the current browser-local
   * week, grouped by derived category and by project. Read-only; category comes
   * from the joined task (decision 2.1 — never snapshotted).
   */
  weeklyRollup: protectedProcedure
    .input(z.object({ tzOffsetMinutes: z.number().int().min(-720).max(840) }))
    .query(async ({ ctx, input }) => {
      const { start, end } = localWeekUtcBounds(new Date(), input.tzOffsetMinutes);

      const rows = await db
        .select({
          startedAt: taskTimeEntries.startedAt,
          endedAt: taskTimeEntries.endedAt,
          category: tasks.category,
          projectId: tasks.projectId,
          projectName: projects.name,
        })
        .from(taskTimeEntries)
        .innerJoin(tasks, eq(taskTimeEntries.taskId, tasks.id))
        .leftJoin(projects, eq(tasks.projectId, projects.id))
        .where(
          and(
            eq(taskTimeEntries.userId, ctx.userId),
            gte(taskTimeEntries.startedAt, start),
            lt(taskTimeEntries.startedAt, end)
          )
        );

      const rollup = aggregateWeek({ entries: rows });

      return {
        weekStart: start,
        weekEnd: end,
        ...rollup,
      };
    }),

  delete: protectedProcedure
    .input(z.object({ entryId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .delete(taskTimeEntries)
        .where(and(eq(taskTimeEntries.id, input.entryId), eq(taskTimeEntries.userId, ctx.userId)))
        .returning({ id: taskTimeEntries.id });

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Time entry not found." });
      }

      return { entryId: row.id };
    }),
});

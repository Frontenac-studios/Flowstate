import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { syncOccurrenceOverrideRow, syncRecurrenceRow } from "@/db/record-sync-mutation";
import { taskOccurrenceOverrides, taskRecurrence, tasks } from "@/db/tables";
import { formatRruleLabel } from "@/lib/recurrence/format-label";

import { createTRPCRouter, protectedProcedure } from "../init";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const occurrencePatchSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  priority: z.number().int().min(0).max(3).optional(),
});

type OverrideStatus = "completed" | "skipped" | "rescheduled" | "edited";

async function getOwnedRecurrence(userId: string, recurrenceId: string) {
  const [row] = await db
    .select()
    .from(taskRecurrence)
    .where(and(eq(taskRecurrence.id, recurrenceId), eq(taskRecurrence.userId, userId)))
    .limit(1);

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Recurrence not found." });
  }

  return row;
}

async function upsertOverride(params: {
  userId: string;
  recurrenceId: string;
  occurrenceDate: string;
  status: OverrideStatus;
  movedToDate?: string | null;
  patch?: Record<string, unknown> | null;
  completedAt?: Date | null;
}) {
  const now = new Date();
  const [existing] = await db
    .select({ id: taskOccurrenceOverrides.id })
    .from(taskOccurrenceOverrides)
    .where(
      and(
        eq(taskOccurrenceOverrides.recurrenceId, params.recurrenceId),
        eq(taskOccurrenceOverrides.occurrenceDate, params.occurrenceDate)
      )
    )
    .limit(1);

  if (existing) {
    const [row] = await db
      .update(taskOccurrenceOverrides)
      .set({
        status: params.status,
        movedToDate: params.movedToDate ?? null,
        patch: params.patch ?? null,
        completedAt: params.completedAt ?? null,
        updatedAt: now,
      })
      .where(eq(taskOccurrenceOverrides.id, existing.id))
      .returning();

    if (!row) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update occurrence override.",
      });
    }

    await syncOccurrenceOverrideRow(row.id, "update", row);
    return row;
  }

  const [row] = await db
    .insert(taskOccurrenceOverrides)
    .values({
      userId: params.userId,
      recurrenceId: params.recurrenceId,
      occurrenceDate: params.occurrenceDate,
      status: params.status,
      movedToDate: params.movedToDate ?? null,
      patch: params.patch ?? null,
      completedAt: params.completedAt ?? null,
    })
    .returning();

  if (!row) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create occurrence override.",
    });
  }

  await syncOccurrenceOverrideRow(row.id, "insert", row);
  return row;
}

export const recurrenceRouter = createTRPCRouter({
  getForTask: protectedProcedure
    .input(z.object({ taskId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await db
        .select({
          id: taskRecurrence.id,
          rrule: taskRecurrence.rrule,
          startDate: taskRecurrence.startDate,
        })
        .from(taskRecurrence)
        .where(and(eq(taskRecurrence.taskId, input.taskId), eq(taskRecurrence.userId, ctx.userId)))
        .limit(1);

      if (!row) return null;

      return {
        id: row.id,
        rrule: row.rrule,
        startDate: row.startDate,
        label: formatRruleLabel(row.rrule),
      };
    }),

  setRule: protectedProcedure
    .input(
      z.object({
        taskId: z.string().uuid(),
        rrule: z.string().min(1).max(2000),
        startDate: isoDateSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [task] = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.id, input.taskId), eq(tasks.userId, ctx.userId)))
        .limit(1);

      if (!task) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found." });
      }

      const now = new Date();
      const [existing] = await db
        .select({ id: taskRecurrence.id })
        .from(taskRecurrence)
        .where(and(eq(taskRecurrence.taskId, input.taskId), eq(taskRecurrence.userId, ctx.userId)))
        .limit(1);

      if (existing) {
        const [row] = await db
          .update(taskRecurrence)
          .set({
            rrule: input.rrule,
            startDate: input.startDate,
            updatedAt: now,
          })
          .where(eq(taskRecurrence.id, existing.id))
          .returning();

        if (!row) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update recurrence.",
          });
        }

        await db
          .update(tasks)
          .set({ scheduledDate: null, updatedAt: now })
          .where(eq(tasks.id, input.taskId));

        await syncRecurrenceRow(row.id, "update", row);
        return { id: row.id, label: formatRruleLabel(row.rrule) };
      }

      const [row] = await db
        .insert(taskRecurrence)
        .values({
          userId: ctx.userId,
          taskId: input.taskId,
          rrule: input.rrule,
          startDate: input.startDate,
        })
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create recurrence.",
        });
      }

      await db
        .update(tasks)
        .set({ scheduledDate: null, updatedAt: now })
        .where(eq(tasks.id, input.taskId));

      await syncRecurrenceRow(row.id, "insert", row);
      return { id: row.id, label: formatRruleLabel(row.rrule) };
    }),

  removeRule: protectedProcedure
    .input(z.object({ taskId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .delete(taskRecurrence)
        .where(and(eq(taskRecurrence.taskId, input.taskId), eq(taskRecurrence.userId, ctx.userId)))
        .returning({ id: taskRecurrence.id });

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Recurrence not found." });
      }

      await syncRecurrenceRow(row.id, "delete", { id: row.id });
      return { id: row.id };
    }),

  completeOccurrence: protectedProcedure
    .input(
      z.object({
        recurrenceId: z.string().uuid(),
        occurrenceDate: isoDateSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      await getOwnedRecurrence(ctx.userId, input.recurrenceId);
      const completedAt = new Date();
      const row = await upsertOverride({
        userId: ctx.userId,
        recurrenceId: input.recurrenceId,
        occurrenceDate: input.occurrenceDate,
        status: "completed",
        completedAt,
      });
      return { id: row.id, completedAt };
    }),

  skipOccurrence: protectedProcedure
    .input(
      z.object({
        recurrenceId: z.string().uuid(),
        occurrenceDate: isoDateSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      await getOwnedRecurrence(ctx.userId, input.recurrenceId);
      const row = await upsertOverride({
        userId: ctx.userId,
        recurrenceId: input.recurrenceId,
        occurrenceDate: input.occurrenceDate,
        status: "skipped",
      });
      return { id: row.id };
    }),

  rescheduleOccurrence: protectedProcedure
    .input(
      z.object({
        recurrenceId: z.string().uuid(),
        occurrenceDate: isoDateSchema,
        movedToDate: isoDateSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      await getOwnedRecurrence(ctx.userId, input.recurrenceId);
      const row = await upsertOverride({
        userId: ctx.userId,
        recurrenceId: input.recurrenceId,
        occurrenceDate: input.occurrenceDate,
        status: "rescheduled",
        movedToDate: input.movedToDate,
      });
      return { id: row.id, movedToDate: row.movedToDate };
    }),

  editOccurrence: protectedProcedure
    .input(
      z.object({
        recurrenceId: z.string().uuid(),
        occurrenceDate: isoDateSchema,
        patch: occurrencePatchSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      await getOwnedRecurrence(ctx.userId, input.recurrenceId);
      const row = await upsertOverride({
        userId: ctx.userId,
        recurrenceId: input.recurrenceId,
        occurrenceDate: input.occurrenceDate,
        status: "edited",
        patch: input.patch,
      });
      return { id: row.id };
    }),
});

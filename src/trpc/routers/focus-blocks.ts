import { and, asc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { focusBlocks, tasks } from "@/db/tables";

import { createTRPCRouter, protectedProcedure } from "../init";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected an ISO date (YYYY-MM-DD).");

const DAY_MINUTES = 24 * 60;
const SNAP_MINUTES = 15;
const DEFAULT_DURATION = 45;

/** Snap to the nearest 15-minute increment and clamp a start into the day. */
function snap(min: number): number {
  const snapped = Math.round(min / SNAP_MINUTES) * SNAP_MINUTES;
  return Math.max(0, Math.min(DAY_MINUTES - SNAP_MINUTES, snapped));
}

/** Snap to the nearest 15-minute increment without clamping (caller clamps). */
function snapRaw(min: number): number {
  return Math.round(min / SNAP_MINUTES) * SNAP_MINUTES;
}

async function assertTaskOwned(userId: string, taskId: string): Promise<void> {
  const [task] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1);

  if (!task) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Task not found." });
  }
}

export const focusBlocksRouter = createTRPCRouter({
  listForDate: protectedProcedure
    .input(z.object({ date: isoDate }))
    .query(async ({ ctx, input }) => {
      return db
        .select({
          id: focusBlocks.id,
          taskId: focusBlocks.taskId,
          date: focusBlocks.date,
          startMin: focusBlocks.startMin,
          endMin: focusBlocks.endMin,
          status: focusBlocks.status,
          title: tasks.title,
        })
        .from(focusBlocks)
        .innerJoin(tasks, eq(tasks.id, focusBlocks.taskId))
        .where(and(eq(focusBlocks.userId, ctx.userId), eq(focusBlocks.date, input.date)))
        .orderBy(asc(focusBlocks.startMin));
    }),

  create: protectedProcedure
    .input(
      z.object({
        taskId: z.string().uuid(),
        date: isoDate,
        startMin: z
          .number()
          .int()
          .min(0)
          .max(DAY_MINUTES - 1),
        durationMin: z.number().int().positive().max(DAY_MINUTES).default(DEFAULT_DURATION),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertTaskOwned(ctx.userId, input.taskId);

      const startMin = snap(input.startMin);
      const endMin = Math.min(DAY_MINUTES, startMin + input.durationMin);
      const now = new Date();

      const [row] = await db
        .insert(focusBlocks)
        .values({
          userId: ctx.userId,
          taskId: input.taskId,
          date: input.date,
          startMin,
          endMin,
          status: "planned",
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!row) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create block." });
      }

      return row;
    }),

  move: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        startMin: z
          .number()
          .int()
          .min(0)
          .max(DAY_MINUTES - 1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select({ startMin: focusBlocks.startMin, endMin: focusBlocks.endMin })
        .from(focusBlocks)
        .where(and(eq(focusBlocks.id, input.id), eq(focusBlocks.userId, ctx.userId)))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Block not found." });
      }

      const duration = existing.endMin - existing.startMin;
      const startMin = snap(input.startMin);
      const endMin = Math.min(DAY_MINUTES, startMin + duration);

      const [row] = await db
        .update(focusBlocks)
        .set({ startMin, endMin, updatedAt: new Date() })
        .where(and(eq(focusBlocks.id, input.id), eq(focusBlocks.userId, ctx.userId)))
        .returning();

      return row;
    }),

  resize: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        startMin: z
          .number()
          .int()
          .min(0)
          .max(DAY_MINUTES - 1),
        endMin: z.number().int().min(SNAP_MINUTES).max(DAY_MINUTES),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let startMin = Math.max(0, snapRaw(input.startMin));
      let endMin = Math.min(DAY_MINUTES, snapRaw(input.endMin));
      // Enforce a minimum 15-minute duration, preferring to keep the start fixed.
      if (endMin - startMin < SNAP_MINUTES) {
        endMin = Math.min(DAY_MINUTES, startMin + SNAP_MINUTES);
        if (endMin - startMin < SNAP_MINUTES) startMin = Math.max(0, endMin - SNAP_MINUTES);
      }

      const [row] = await db
        .update(focusBlocks)
        .set({ startMin, endMin, updatedAt: new Date() })
        .where(and(eq(focusBlocks.id, input.id), eq(focusBlocks.userId, ctx.userId)))
        .returning();

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Block not found." });
      }

      return row;
    }),

  complete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .update(focusBlocks)
        .set({ status: "done", updatedAt: new Date() })
        .where(and(eq(focusBlocks.id, input.id), eq(focusBlocks.userId, ctx.userId)))
        .returning();

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Block not found." });
      }

      return row;
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(focusBlocks)
        .where(and(eq(focusBlocks.id, input.id), eq(focusBlocks.userId, ctx.userId)));
      return { id: input.id };
    }),
});

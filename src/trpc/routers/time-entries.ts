import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { taskTimeEntries, tasks } from "@/db/tables";

import { createTRPCRouter, protectedProcedure } from "../init";

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

  recentForTask: protectedProcedure
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
        .limit(5);

      return rows;
    }),
});

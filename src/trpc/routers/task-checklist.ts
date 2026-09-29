import { and, asc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { syncTaskChecklistItemRow } from "@/db/record-sync-mutation";
import { taskChecklistItems, tasks } from "@/db/tables";

import { createTRPCRouter, protectedProcedure } from "../init";

const itemTextSchema = z.string().trim().min(1).max(500);

async function assertOwnedTask(userId: string, taskId: string) {
  const [row] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found." });
}

async function getOwnedItem(userId: string, itemId: string) {
  const [row] = await db
    .select()
    .from(taskChecklistItems)
    .where(and(eq(taskChecklistItems.id, itemId), eq(taskChecklistItems.userId, userId)))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Checklist item not found." });
  return row;
}

async function updateItem(
  userId: string,
  itemId: string,
  patch: Partial<typeof taskChecklistItems.$inferInsert>
) {
  const [row] = await db
    .update(taskChecklistItems)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(taskChecklistItems.id, itemId), eq(taskChecklistItems.userId, userId)))
    .returning();
  if (!row) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update item." });
  }
  await syncTaskChecklistItemRow(row.id, "update", row);
  return row;
}

/** Spec v5 DetailA — a task's checklist (sub-steps ticked off in the detail sheet). */
export const taskChecklistRouter = createTRPCRouter({
  listByTask: protectedProcedure
    .input(z.object({ taskId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertOwnedTask(ctx.userId, input.taskId);
      return db
        .select({
          id: taskChecklistItems.id,
          text: taskChecklistItems.text,
          doneAt: taskChecklistItems.doneAt,
          sortOrder: taskChecklistItems.sortOrder,
        })
        .from(taskChecklistItems)
        .where(
          and(
            eq(taskChecklistItems.userId, ctx.userId),
            eq(taskChecklistItems.taskId, input.taskId)
          )
        )
        .orderBy(asc(taskChecklistItems.sortOrder), asc(taskChecklistItems.createdAt));
    }),

  create: protectedProcedure
    .input(z.object({ taskId: z.string().uuid(), text: itemTextSchema }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnedTask(ctx.userId, input.taskId);
      const siblings = await db
        .select({ sortOrder: taskChecklistItems.sortOrder })
        .from(taskChecklistItems)
        .where(
          and(
            eq(taskChecklistItems.userId, ctx.userId),
            eq(taskChecklistItems.taskId, input.taskId)
          )
        );
      const nextSortOrder = siblings.reduce((max, s) => Math.max(max, s.sortOrder + 1), 0);
      const [row] = await db
        .insert(taskChecklistItems)
        .values({
          userId: ctx.userId,
          taskId: input.taskId,
          text: input.text,
          sortOrder: nextSortOrder,
        })
        .returning();
      if (!row) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to add item." });
      }
      await syncTaskChecklistItemRow(row.id, "insert", row);
      return row;
    }),

  rename: protectedProcedure
    .input(z.object({ id: z.string().uuid(), text: itemTextSchema }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedItem(ctx.userId, input.id);
      return updateItem(ctx.userId, input.id, { text: input.text });
    }),

  setDone: protectedProcedure
    .input(z.object({ id: z.string().uuid(), done: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedItem(ctx.userId, input.id);
      return updateItem(ctx.userId, input.id, { doneAt: input.done ? new Date() : null });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedItem(ctx.userId, input.id);
      await db
        .delete(taskChecklistItems)
        .where(and(eq(taskChecklistItems.id, input.id), eq(taskChecklistItems.userId, ctx.userId)));
      await syncTaskChecklistItemRow(input.id, "delete", { id: input.id, userId: ctx.userId });
      return { id: input.id };
    }),
});

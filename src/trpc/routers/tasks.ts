import { and, asc, desc, eq, isNull, lte, ne, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { projects } from "@/db/schema/projects";
import { tasks } from "@/db/schema/tasks";
import { startOfLocalDay, toISODateString } from "@/lib/dates/local-day";

import { createTRPCRouter, protectedProcedure } from "../init";

const taskSnapshotSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  priority: z.number().int().min(0).max(3),
  scheduledDate: z.string().nullable(),
  bucketOverride: z.string().nullable(),
  projectId: z.string().uuid().nullable(),
  isTop3: z.boolean(),
  top3Order: z.number().int().nullable(),
});

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

export const tasksRouter = createTRPCRouter({
  listToday: protectedProcedure.query(async ({ ctx }) => {
    const todayIso = toISODateString(startOfLocalDay());

    const rows = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        priority: tasks.priority,
        scheduledDate: tasks.scheduledDate,
        bucketOverride: tasks.bucketOverride,
        projectId: tasks.projectId,
        isTop3: tasks.isTop3,
        top3Order: tasks.top3Order,
        completedAt: tasks.completedAt,
        createdAt: tasks.createdAt,
        projectSlug: projects.slug,
        projectName: projects.name,
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(
        and(
          eq(tasks.userId, ctx.userId),
          isNull(tasks.completedAt),
          or(isNull(tasks.scheduledDate), lte(tasks.scheduledDate, todayIso)),
          or(isNull(tasks.bucketOverride), ne(tasks.bucketOverride, "later"))
        )
      )
      .orderBy(desc(tasks.priority), asc(tasks.createdAt));

    return rows;
  }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(500),
        scheduledDate: z.string().nullable().optional(),
        bucketOverride: z.enum(["later"]).nullable().optional(),
        projectId: z.string().uuid().nullable().optional(),
        priority: z.number().int().min(0).max(3).default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const todayIso = toISODateString(startOfLocalDay());
      const scheduledDate =
        input.bucketOverride === "later" ? null : (input.scheduledDate ?? todayIso);

      const [row] = await db
        .insert(tasks)
        .values({
          userId: ctx.userId,
          title: input.title.trim(),
          scheduledDate,
          bucketOverride: input.bucketOverride ?? null,
          projectId: input.projectId ?? null,
          priority: input.priority,
        })
        .returning();

      if (!row) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create task." });
      }

      return row;
    }),

  createFromSnapshot: protectedProcedure
    .input(taskSnapshotSchema)
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .insert(tasks)
        .values({
          id: input.id,
          userId: ctx.userId,
          title: input.title,
          priority: input.priority,
          scheduledDate: input.scheduledDate,
          bucketOverride: input.bucketOverride,
          projectId: input.projectId,
          isTop3: input.isTop3,
          top3Order: input.top3Order,
        })
        .returning();

      if (!row) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to restore task." });
      }

      return row;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(500).optional(),
        priority: z.number().int().min(0).max(3).optional(),
        projectId: z.string().uuid().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await getOwnedTask(ctx.userId, input.id);

      const patch: Partial<typeof tasks.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (input.title !== undefined) patch.title = input.title.trim();
      if (input.priority !== undefined) patch.priority = input.priority;
      if (input.projectId !== undefined) patch.projectId = input.projectId;

      const [row] = await db
        .update(tasks)
        .set(patch)
        .where(and(eq(tasks.id, input.id), eq(tasks.userId, ctx.userId)))
        .returning();

      return row!;
    }),

  complete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getOwnedTask(ctx.userId, input.id);
      const completedAt = new Date();

      const [row] = await db
        .update(tasks)
        .set({ completedAt, updatedAt: completedAt })
        .where(and(eq(tasks.id, input.id), eq(tasks.userId, ctx.userId)))
        .returning();

      return {
        task: row!,
        previousCompletedAt: existing.completedAt,
      };
    }),

  uncomplete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedTask(ctx.userId, input.id);

      const [row] = await db
        .update(tasks)
        .set({ completedAt: null, updatedAt: new Date() })
        .where(and(eq(tasks.id, input.id), eq(tasks.userId, ctx.userId)))
        .returning();

      return row!;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getOwnedTask(ctx.userId, input.id);

      await db.delete(tasks).where(and(eq(tasks.id, input.id), eq(tasks.userId, ctx.userId)));

      return {
        snapshot: {
          id: existing.id,
          title: existing.title,
          priority: existing.priority,
          scheduledDate: existing.scheduledDate,
          bucketOverride: existing.bucketOverride,
          projectId: existing.projectId,
          isTop3: existing.isTop3,
          top3Order: existing.top3Order,
        },
      };
    }),
});

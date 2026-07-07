import { and, asc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { syncProjectMilestoneRow } from "@/db/record-sync-mutation";
import { projectMilestones, projects } from "@/db/tables";

import { createTRPCRouter, protectedProcedure } from "../init";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected an ISO date (YYYY-MM-DD).");

async function getOwnedMilestone(userId: string, milestoneId: string) {
  const [row] = await db
    .select()
    .from(projectMilestones)
    .where(and(eq(projectMilestones.id, milestoneId), eq(projectMilestones.userId, userId)))
    .limit(1);

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Milestone not found." });
  }

  return row;
}

async function assertOwnedProject(userId: string, projectId: string) {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
  }
}

export const projectMilestonesRouter = createTRPCRouter({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertOwnedProject(ctx.userId, input.projectId);

      return db
        .select({
          id: projectMilestones.id,
          projectId: projectMilestones.projectId,
          title: projectMilestones.title,
          targetDate: projectMilestones.targetDate,
          sortOrder: projectMilestones.sortOrder,
          completedAt: projectMilestones.completedAt,
        })
        .from(projectMilestones)
        .where(
          and(
            eq(projectMilestones.userId, ctx.userId),
            eq(projectMilestones.projectId, input.projectId)
          )
        )
        .orderBy(asc(projectMilestones.sortOrder), asc(projectMilestones.title));
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        title: z.string().min(1).max(200),
        targetDate: isoDateSchema.nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertOwnedProject(ctx.userId, input.projectId);

      const siblings = await db
        .select({ sortOrder: projectMilestones.sortOrder })
        .from(projectMilestones)
        .where(
          and(
            eq(projectMilestones.userId, ctx.userId),
            eq(projectMilestones.projectId, input.projectId)
          )
        );
      const nextSortOrder = siblings.reduce((max, s) => Math.max(max, s.sortOrder + 1), 0);

      const [row] = await db
        .insert(projectMilestones)
        .values({
          userId: ctx.userId,
          projectId: input.projectId,
          title: input.title.trim(),
          targetDate: input.targetDate ?? null,
          sortOrder: nextSortOrder,
        })
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create milestone.",
        });
      }

      await syncProjectMilestoneRow(row.id, "insert", row);
      return row;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(200).optional(),
        targetDate: isoDateSchema.nullable().optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await getOwnedMilestone(ctx.userId, input.id);

      const patch: Partial<typeof projectMilestones.$inferInsert> = { updatedAt: new Date() };
      if (input.title !== undefined) patch.title = input.title.trim();
      if (input.targetDate !== undefined) patch.targetDate = input.targetDate;
      if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;

      const [row] = await db
        .update(projectMilestones)
        .set(patch)
        .where(and(eq(projectMilestones.id, input.id), eq(projectMilestones.userId, ctx.userId)))
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update milestone.",
        });
      }

      await syncProjectMilestoneRow(row.id, "update", row);
      return row;
    }),

  setComplete: protectedProcedure
    .input(z.object({ id: z.string().uuid(), completed: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedMilestone(ctx.userId, input.id);

      const [row] = await db
        .update(projectMilestones)
        .set({ completedAt: input.completed ? new Date() : null, updatedAt: new Date() })
        .where(and(eq(projectMilestones.id, input.id), eq(projectMilestones.userId, ctx.userId)))
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update milestone.",
        });
      }

      await syncProjectMilestoneRow(row.id, "update", row);
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedMilestone(ctx.userId, input.id);

      await db
        .delete(projectMilestones)
        .where(and(eq(projectMilestones.id, input.id), eq(projectMilestones.userId, ctx.userId)));

      await syncProjectMilestoneRow(input.id, "delete", { id: input.id, userId: ctx.userId });
      return { id: input.id };
    }),
});

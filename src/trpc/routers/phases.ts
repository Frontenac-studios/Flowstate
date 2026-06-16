import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { syncPhaseRow, syncTaskRow } from "@/db/record-sync-mutation";
import { phases, projects, tasks } from "@/db/tables";

import { createTRPCRouter, protectedProcedure } from "../init";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected an ISO date (YYYY-MM-DD).");

async function getOwnedPhase(userId: string, phaseId: string) {
  const [row] = await db
    .select()
    .from(phases)
    .where(and(eq(phases.id, phaseId), eq(phases.userId, userId)))
    .limit(1);

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Phase not found." });
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

/** Collect a phase id plus all of its descendant phase ids from a flat list. */
function collectSubtreeIds(
  rootId: string,
  rows: { id: string; parentPhaseId: string | null }[]
): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.parentPhaseId) continue;
    const list = childrenByParent.get(row.parentPhaseId) ?? [];
    list.push(row.id);
    childrenByParent.set(row.parentPhaseId, list);
  }

  const result: string[] = [];
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    result.push(id);
    for (const childId of childrenByParent.get(id) ?? []) {
      stack.push(childId);
    }
  }
  return result;
}

export const phasesRouter = createTRPCRouter({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertOwnedProject(ctx.userId, input.projectId);

      return db
        .select({
          id: phases.id,
          projectId: phases.projectId,
          parentPhaseId: phases.parentPhaseId,
          name: phases.name,
          description: phases.description,
          startDate: phases.startDate,
          endDate: phases.endDate,
          sortOrder: phases.sortOrder,
          completedAt: phases.completedAt,
        })
        .from(phases)
        .where(and(eq(phases.userId, ctx.userId), eq(phases.projectId, input.projectId)))
        .orderBy(asc(phases.sortOrder), asc(phases.name));
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        parentPhaseId: z.string().uuid().nullable().optional(),
        name: z.string().min(1).max(200),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertOwnedProject(ctx.userId, input.projectId);

      if (input.parentPhaseId) {
        const parent = await getOwnedPhase(ctx.userId, input.parentPhaseId);
        if (parent.projectId !== input.projectId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Parent phase belongs to a different project.",
          });
        }
      }

      const siblings = await db
        .select({ sortOrder: phases.sortOrder })
        .from(phases)
        .where(
          and(
            eq(phases.userId, ctx.userId),
            eq(phases.projectId, input.projectId),
            input.parentPhaseId
              ? eq(phases.parentPhaseId, input.parentPhaseId)
              : isNull(phases.parentPhaseId)
          )
        );
      const nextSortOrder = siblings.reduce((max, s) => Math.max(max, s.sortOrder + 1), 0);

      const [row] = await db
        .insert(phases)
        .values({
          userId: ctx.userId,
          projectId: input.projectId,
          parentPhaseId: input.parentPhaseId ?? null,
          name: input.name.trim(),
          sortOrder: nextSortOrder,
        })
        .returning();

      if (!row) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create phase." });
      }

      await syncPhaseRow(row.id, "insert", row);
      return row;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).nullable().optional(),
        startDate: isoDateSchema.nullable().optional(),
        endDate: isoDateSchema.nullable().optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await getOwnedPhase(ctx.userId, input.id);

      if (input.startDate != null && input.endDate != null && input.endDate < input.startDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "endDate must be on or after startDate.",
        });
      }

      const patch: Partial<typeof phases.$inferInsert> = { updatedAt: new Date() };
      if (input.name !== undefined) patch.name = input.name.trim();
      if (input.description !== undefined) patch.description = input.description;
      if (input.startDate !== undefined) patch.startDate = input.startDate;
      if (input.endDate !== undefined) patch.endDate = input.endDate;
      if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;

      const [row] = await db
        .update(phases)
        .set(patch)
        .where(and(eq(phases.id, input.id), eq(phases.userId, ctx.userId)))
        .returning();

      if (!row) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update phase." });
      }

      await syncPhaseRow(row.id, "update", row);
      return row;
    }),

  setComplete: protectedProcedure
    .input(z.object({ id: z.string().uuid(), completed: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const phase = await getOwnedPhase(ctx.userId, input.id);

      if (!input.completed) {
        const [row] = await db
          .update(phases)
          .set({ completedAt: null, updatedAt: new Date() })
          .where(and(eq(phases.id, input.id), eq(phases.userId, ctx.userId)))
          .returning();
        if (row) await syncPhaseRow(row.id, "update", row);
        return { phasesCompleted: 0, tasksCompleted: 0 };
      }

      const projectPhases = await db
        .select({ id: phases.id, parentPhaseId: phases.parentPhaseId })
        .from(phases)
        .where(and(eq(phases.userId, ctx.userId), eq(phases.projectId, phase.projectId)));

      const subtreeIds = collectSubtreeIds(input.id, projectPhases);
      const now = new Date();

      const completedPhases = await db
        .update(phases)
        .set({ completedAt: now, updatedAt: now })
        .where(and(eq(phases.userId, ctx.userId), inArray(phases.id, subtreeIds)))
        .returning();
      for (const row of completedPhases) await syncPhaseRow(row.id, "update", row);

      const completedTasks = await db
        .update(tasks)
        .set({ completedAt: now, updatedAt: now })
        .where(
          and(
            eq(tasks.userId, ctx.userId),
            inArray(tasks.phaseId, subtreeIds),
            isNull(tasks.completedAt)
          )
        )
        .returning();
      for (const row of completedTasks) await syncTaskRow(row.id, "update", row);

      return { phasesCompleted: completedPhases.length, tasksCompleted: completedTasks.length };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedPhase(ctx.userId, input.id);

      await db.delete(phases).where(and(eq(phases.id, input.id), eq(phases.userId, ctx.userId)));

      await syncPhaseRow(input.id, "delete", { id: input.id, userId: ctx.userId });
      return { id: input.id };
    }),
});

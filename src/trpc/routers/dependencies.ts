import { and, eq, inArray, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { taskDependencies, tasks } from "@/db/tables";
import { isActiveEdge } from "@/lib/tasks/dependencies/blocked";
import { wouldCreateCycle } from "@/lib/tasks/dependencies/cycle";
import { endOfWindowWeek, isTaskInWindow } from "@/lib/tasks/dependencies/window";

import { createTRPCRouter, protectedProcedure } from "../init";

/** Soft cap on active blockers per task (3.e) — bounds the graph + weight math. */
const MAX_BLOCKERS_PER_TASK = 8;

export const dependenciesRouter = createTRPCRouter({
  /**
   * Add a blocker→blocked edge (3.g). Kind is decided by project-match and frozen:
   * same project → durable; otherwise → window edge (both tasks must be in
   * Today/This Week), expiring at the creator's ISO week boundary.
   */
  create: protectedProcedure
    .input(
      z.object({
        blockerTaskId: z.string().uuid(),
        blockedTaskId: z.string().uuid(),
        tzOffsetMinutes: z.number().int().min(-840).max(840),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { blockerTaskId, blockedTaskId } = input;
      if (blockerTaskId === blockedTaskId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A task can't block itself." });
      }

      const taskRows = await db
        .select({
          id: tasks.id,
          projectId: tasks.projectId,
          scheduledDate: tasks.scheduledDate,
          bucketOverride: tasks.bucketOverride,
          completedAt: tasks.completedAt,
        })
        .from(tasks)
        .where(
          and(eq(tasks.userId, ctx.userId), inArray(tasks.id, [blockerTaskId, blockedTaskId]))
        );

      const blocker = taskRows.find((t) => t.id === blockerTaskId);
      const blocked = taskRows.find((t) => t.id === blockedTaskId);
      if (!blocker || !blocked) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found." });
      }

      // All of the user's edges; the cycle check + soft cap run over the active set.
      const userEdges = await db
        .select({
          blockerTaskId: taskDependencies.blockerTaskId,
          blockedTaskId: taskDependencies.blockedTaskId,
          expiresAt: taskDependencies.expiresAt,
        })
        .from(taskDependencies)
        .where(eq(taskDependencies.userId, ctx.userId));

      const now = new Date();
      const activeEdges = userEdges.filter((e) => isActiveEdge(e, now));

      if (
        activeEdges.some(
          (e) => e.blockerTaskId === blockerTaskId && e.blockedTaskId === blockedTaskId
        )
      ) {
        throw new TRPCError({ code: "CONFLICT", message: "These tasks are already linked." });
      }

      const activeBlockerCount = activeEdges.filter(
        (e) => e.blockedTaskId === blockedTaskId
      ).length;
      if (activeBlockerCount >= MAX_BLOCKERS_PER_TASK) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This task already has the maximum number of blockers.",
        });
      }

      if (wouldCreateCycle(activeEdges, blockerTaskId, blockedTaskId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That would create a circular dependency.",
        });
      }

      // Kind by project-match, frozen on the row.
      const sameProject = blocker.projectId !== null && blocker.projectId === blocked.projectId;
      let expiresAt: Date | null = null;
      if (!sameProject) {
        if (!isTaskInWindow(blocker, now) || !isTaskInWindow(blocked, now)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cross-project links are only allowed for tasks scheduled this week.",
          });
        }
        expiresAt = endOfWindowWeek(now, input.tzOffsetMinutes);
      }

      const [row] = await db
        .insert(taskDependencies)
        .values({ userId: ctx.userId, blockerTaskId, blockedTaskId, expiresAt })
        .returning({ id: taskDependencies.id, expiresAt: taskDependencies.expiresAt });

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create dependency.",
        });
      }

      return { id: row.id, expiresAt: row.expiresAt };
    }),

  /** Remove an edge by id (hard-delete, 3.k). */
  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .delete(taskDependencies)
        .where(and(eq(taskDependencies.id, input.id), eq(taskDependencies.userId, ctx.userId)))
        .returning({ id: taskDependencies.id });

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dependency not found." });
      }

      return { id: row.id };
    }),

  /** Active edges where the task is the blocker or the blocked side. */
  listForTask: protectedProcedure
    .input(z.object({ taskId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await db
        .select({
          id: taskDependencies.id,
          blockerTaskId: taskDependencies.blockerTaskId,
          blockedTaskId: taskDependencies.blockedTaskId,
          expiresAt: taskDependencies.expiresAt,
        })
        .from(taskDependencies)
        .where(
          and(
            eq(taskDependencies.userId, ctx.userId),
            or(
              eq(taskDependencies.blockerTaskId, input.taskId),
              eq(taskDependencies.blockedTaskId, input.taskId)
            )
          )
        );

      const now = new Date();
      return rows.filter((r) => isActiveEdge(r, now));
    }),
});

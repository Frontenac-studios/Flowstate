import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import {
  syncTaskBulkImportItemRow,
  syncTaskBulkImportRow,
  syncTaskRow,
} from "@/db/record-sync-mutation";
import { projects, taskBulkImportItems, taskBulkImports, tasks } from "@/db/tables";

import { createTRPCRouter, protectedProcedure } from "../init";

const bulkTaskInputSchema = z.object({
  title: z.string().min(1).max(500),
  scheduledDate: z.string().nullable(),
  bucketOverride: z.enum(["later"]).nullable(),
  priority: z.number().int().min(0).max(3),
  phaseId: z.string().uuid().nullable(),
});

async function assertOwnedProject(userId: string, projectId: string) {
  const [row] = await db
    .select({ id: projects.id, category: projects.category })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
  }
  return row;
}

async function getOwnedImport(userId: string, importId: string) {
  const [row] = await db
    .select()
    .from(taskBulkImports)
    .where(and(eq(taskBulkImports.id, importId), eq(taskBulkImports.userId, userId)))
    .limit(1);

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Import not found." });
  }

  return row;
}

export const taskBulkImportsRouter = createTRPCRouter({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertOwnedProject(ctx.userId, input.projectId);

      return db
        .select({
          id: taskBulkImports.id,
          taskCount: taskBulkImports.taskCount,
          createdAt: taskBulkImports.createdAt,
          undoneAt: taskBulkImports.undoneAt,
        })
        .from(taskBulkImports)
        .where(
          and(
            eq(taskBulkImports.userId, ctx.userId),
            eq(taskBulkImports.projectId, input.projectId)
          )
        )
        .orderBy(desc(taskBulkImports.createdAt));
    }),

  listTasksForImport: protectedProcedure
    .input(z.object({ importId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await getOwnedImport(ctx.userId, input.importId);

      return db
        .select({
          id: tasks.id,
          title: tasks.title,
        })
        .from(taskBulkImportItems)
        .innerJoin(tasks, eq(taskBulkImportItems.taskId, tasks.id))
        .where(and(eq(taskBulkImportItems.importId, input.importId), eq(tasks.userId, ctx.userId)))
        .orderBy(asc(tasks.createdAt));
    }),

  bulkCreate: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        tasks: z.array(bulkTaskInputSchema).min(2).max(50),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await assertOwnedProject(ctx.userId, input.projectId);

      const now = new Date();
      const taskCount = input.tasks.length;

      const result = await db.transaction(async (tx) => {
        const [importRow] = await tx
          .insert(taskBulkImports)
          .values({
            userId: ctx.userId,
            projectId: input.projectId,
            taskCount,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        if (!importRow) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create import record.",
          });
        }

        const createdTasks = await tx
          .insert(tasks)
          .values(
            input.tasks.map((t) => ({
              userId: ctx.userId,
              projectId: input.projectId,
              phaseId: t.phaseId,
              title: t.title.trim(),
              scheduledDate: t.bucketOverride === "later" ? null : t.scheduledDate,
              bucketOverride: t.bucketOverride,
              priority: t.priority,
              // Imported tasks belong to a project, so they inherit its category
              // (resolver layer 2 — project context); a real categorization, not unresolved.
              category: project.category,
            }))
          )
          .returning();

        if (createdTasks.length !== taskCount) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create tasks.",
          });
        }

        await tx.insert(taskBulkImportItems).values(
          createdTasks.map((row) => ({
            importId: importRow.id,
            taskId: row.id,
            userId: ctx.userId,
            updatedAt: now,
          }))
        );

        return { importRow, createdTasks };
      });

      await syncTaskBulkImportRow(result.importRow.id, "insert", result.importRow);
      for (const row of result.createdTasks) {
        await syncTaskRow(row.id, "insert", row);
        await syncTaskBulkImportItemRow(`${result.importRow.id}:${row.id}`, "insert", {
          importId: result.importRow.id,
          taskId: row.id,
          userId: ctx.userId,
          updatedAt: now,
        });
      }

      return {
        importId: result.importRow.id,
        createdCount: result.createdTasks.length,
        taskIds: result.createdTasks.map((t) => t.id),
      };
    }),

  undo: protectedProcedure
    .input(z.object({ importId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const importRow = await getOwnedImport(ctx.userId, input.importId);

      if (importRow.undoneAt) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This import has already been undone.",
        });
      }

      const items = await db
        .select({ taskId: taskBulkImportItems.taskId })
        .from(taskBulkImportItems)
        .where(eq(taskBulkImportItems.importId, input.importId));

      const taskIds = items.map((i) => i.taskId);
      if (taskIds.length === 0) {
        const now = new Date();
        const [updated] = await db
          .update(taskBulkImports)
          .set({ undoneAt: now, updatedAt: now })
          .where(
            and(eq(taskBulkImports.id, input.importId), eq(taskBulkImports.userId, ctx.userId))
          )
          .returning();
        if (updated) await syncTaskBulkImportRow(updated.id, "update", updated);
        return { deletedCount: 0 };
      }

      const now = new Date();
      const undoResult = await db.transaction(async (tx) => {
        const deleted = await tx
          .delete(tasks)
          .where(and(eq(tasks.userId, ctx.userId), inArray(tasks.id, taskIds)))
          .returning({ id: tasks.id });

        const [updated] = await tx
          .update(taskBulkImports)
          .set({ undoneAt: now, updatedAt: now })
          .where(
            and(eq(taskBulkImports.id, input.importId), eq(taskBulkImports.userId, ctx.userId))
          )
          .returning();

        if (!updated) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to mark import as undone.",
          });
        }

        return { deleted, updated };
      });

      for (const row of undoResult.deleted) {
        await syncTaskRow(row.id, "delete", { id: row.id, userId: ctx.userId });
      }
      await syncTaskBulkImportRow(undoResult.updated.id, "update", undoResult.updated);

      return { deletedCount: undoResult.deleted.length };
    }),
});

import { and, asc, count, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { syncProjectRow, syncProjectTemplateRow } from "@/db/record-sync-mutation";
import { phases, projectTemplates, projects, tasks } from "@/db/tables";
import { PROJECT_CATEGORIES } from "@/lib/projects/categories";
import { slugifyProjectName } from "@/lib/projects/slugify";
import {
  buildTemplateStructureFromProject,
  countTemplateItems,
  projectTemplateStructureSchema,
} from "@/lib/projects/template-structure";
import { applyProjectTemplate, syncAppliedTemplateRows } from "@/server/projects/apply-template";

import { createTRPCRouter, protectedProcedure } from "../init";

const categorySchema = z.enum(PROJECT_CATEGORIES);

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}

async function getOwnedProject(userId: string, projectId: string) {
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
  }

  return row;
}

async function getOwnedTemplate(userId: string, templateId: string) {
  const [row] = await db
    .select()
    .from(projectTemplates)
    .where(and(eq(projectTemplates.id, templateId), eq(projectTemplates.userId, userId)))
    .limit(1);

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Template not found." });
  }

  return row;
}

export const projectsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    // Left join keeps projects with zero tasks; COUNT(column) ignores NULLs, so
    // counting `completedAt` yields the completed-task tally per project.
    return db
      .select({
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
        category: projects.category,
        taskCount: count(tasks.id),
        completedCount: count(tasks.completedAt),
      })
      .from(projects)
      .leftJoin(tasks, eq(tasks.projectId, projects.id))
      .where(eq(projects.userId, ctx.userId))
      .groupBy(projects.id)
      .orderBy(projects.name);
  }),

  listTemplates: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select({
        id: projectTemplates.id,
        name: projectTemplates.name,
        category: projectTemplates.category,
        structure: projectTemplates.structure,
        updatedAt: projectTemplates.updatedAt,
      })
      .from(projectTemplates)
      .where(eq(projectTemplates.userId, ctx.userId))
      .orderBy(asc(projectTemplates.name));

    return rows.map((row) => {
      const parsed = projectTemplateStructureSchema.parse(row.structure);
      const counts = countTemplateItems(parsed);
      return {
        id: row.id,
        name: row.name,
        category: row.category,
        phaseCount: counts.phaseCount,
        taskCount: counts.taskCount,
        updatedAt: row.updatedAt,
      };
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return getOwnedProject(ctx.userId, input.id);
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(120),
        slug: z.string().min(1).max(64).optional(),
        category: categorySchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const slug = (input.slug ?? slugifyProjectName(input.name)).toLowerCase();

      const [existing] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.userId, ctx.userId), eq(projects.slug, slug)))
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A project with this slug already exists.",
        });
      }

      let row: typeof projects.$inferSelect | undefined;
      try {
        [row] = await db
          .insert(projects)
          .values({
            userId: ctx.userId,
            name: input.name.trim(),
            slug,
            category: input.category,
          })
          .returning();
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A project with this slug already exists.",
          });
        }
        throw error;
      }

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create project.",
        });
      }

      await syncProjectRow(row.id, "insert", row);
      return row;
    }),

  createFromTemplate: protectedProcedure
    .input(
      z.object({
        templateId: z.string().uuid(),
        name: z.string().min(1).max(120),
        category: categorySchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const template = await getOwnedTemplate(ctx.userId, input.templateId);
      const structure = projectTemplateStructureSchema.parse(template.structure);
      const slug = slugifyProjectName(input.name).toLowerCase();

      const [existing] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.userId, ctx.userId), eq(projects.slug, slug)))
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A project with this slug already exists.",
        });
      }

      try {
        const { project, applied } = await db.transaction(async (tx) => {
          const [row] = await tx
            .insert(projects)
            .values({
              userId: ctx.userId,
              name: input.name.trim(),
              slug,
              category: input.category,
            })
            .returning();

          if (!row) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to create project.",
            });
          }

          const applied = await applyProjectTemplate({
            tx,
            userId: ctx.userId,
            projectId: row.id,
            category: input.category,
            structure,
          });

          return { project: row, applied };
        });

        await syncProjectRow(project.id, "insert", project);
        await syncAppliedTemplateRows(applied);
        return project;
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A project with this slug already exists.",
          });
        }
        throw error;
      }
    }),

  saveAsTemplate: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        name: z.string().min(1).max(120).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await getOwnedProject(ctx.userId, input.projectId);

      const [phaseRows, taskRows] = await Promise.all([
        db
          .select({
            id: phases.id,
            parentPhaseId: phases.parentPhaseId,
            name: phases.name,
            sortOrder: phases.sortOrder,
          })
          .from(phases)
          .where(and(eq(phases.userId, ctx.userId), eq(phases.projectId, input.projectId))),
        db
          .select({
            phaseId: tasks.phaseId,
            title: tasks.title,
            timeEstimateMinutes: tasks.timeEstimateMinutes,
            sortOrder: tasks.sortOrder,
          })
          .from(tasks)
          .where(and(eq(tasks.userId, ctx.userId), eq(tasks.projectId, input.projectId))),
      ]);

      const structure = buildTemplateStructureFromProject(phaseRows, taskRows);
      const templateName = (input.name ?? project.name).trim();

      const [row] = await db
        .insert(projectTemplates)
        .values({
          userId: ctx.userId,
          name: templateName,
          category: project.category,
          structure,
        })
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save template.",
        });
      }

      await syncProjectTemplateRow(row.id, "insert", row);
      return row;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(120).optional(),
        category: categorySchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await getOwnedProject(ctx.userId, input.id);

      const patch: Partial<typeof projects.$inferInsert> = { updatedAt: new Date() };
      if (input.name !== undefined) patch.name = input.name.trim();
      if (input.category !== undefined) patch.category = input.category;

      const [row] = await db
        .update(projects)
        .set(patch)
        .where(and(eq(projects.id, input.id), eq(projects.userId, ctx.userId)))
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update project.",
        });
      }

      await syncProjectRow(row.id, "update", row);
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedProject(ctx.userId, input.id);

      await db
        .delete(projects)
        .where(and(eq(projects.id, input.id), eq(projects.userId, ctx.userId)));

      await syncProjectRow(input.id, "delete", { id: input.id, userId: ctx.userId });
      return { id: input.id };
    }),
});

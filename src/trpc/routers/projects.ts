import { and, asc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { syncProjectRow, syncProjectTemplateRow } from "@/db/record-sync-mutation";
import {
  phases,
  projectTemplates,
  projects,
  tasks,
  taskTimeEntries,
  weekDayPriorities,
} from "@/db/tables";
import {
  aggregateSecondsByTask,
  rollupProjectPhaseTime,
} from "@/lib/projects/aggregate-time-rollups";
import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";
import { countEstimateSamplesForUser } from "@/lib/projects/count-estimate-samples";
import { buildMultiProjectCalendarRows } from "@/lib/projects/multi-project-calendar";
import { rankTemplatesBySimilarProjects } from "@/lib/projects/project-similarity";
import { weightedProgressForTasks } from "@/lib/projects/progress-task-input";
import { slugifyProjectName } from "@/lib/projects/slugify";
import {
  buildTemplateStructureFromProject,
  countTemplateItems,
  projectTemplateStructureSchema,
} from "@/lib/projects/template-structure";
import {
  filterPayloadByItemIds,
  proposedActionSchema,
  replanProjectDatesProposalSchema,
} from "@/lib/chat/proposed-actions";
import { applyProjectTemplate, syncAppliedTemplateRows } from "@/server/projects/apply-template";
import {
  backfillProjectEmbedding,
  clearUserSimilarityLink,
  enrichStructureWithSimilarDurations,
  inferAndStoreSimilarProjects,
  listProjectSimilarityLinks,
  listSimilarCandidatesForUser,
  upsertProjectSimilarity,
} from "@/server/projects/similarity";
import {
  applyProjectSlipReplanProposal,
  buildProjectSlipReplanProposal,
} from "@/server/projects/slip-replan";

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
    const [projectRows, taskRows, pinnedRows, timeEntryRows] = await Promise.all([
      db
        .select({
          id: projects.id,
          name: projects.name,
          slug: projects.slug,
          category: projects.category,
        })
        .from(projects)
        .where(and(eq(projects.userId, ctx.userId), isNull(projects.archivedAt)))
        .orderBy(projects.name),
      db
        .select({
          id: tasks.id,
          projectId: tasks.projectId,
          completedAt: tasks.completedAt,
          isTop3: tasks.isTop3,
        })
        .from(tasks)
        .where(and(eq(tasks.userId, ctx.userId), isNotNull(tasks.projectId))),
      db
        .select({ taskId: weekDayPriorities.taskId })
        .from(weekDayPriorities)
        .where(eq(weekDayPriorities.userId, ctx.userId)),
      db
        .select({
          taskId: taskTimeEntries.taskId,
          startedAt: taskTimeEntries.startedAt,
          endedAt: taskTimeEntries.endedAt,
          projectId: tasks.projectId,
        })
        .from(taskTimeEntries)
        .innerJoin(tasks, eq(taskTimeEntries.taskId, tasks.id))
        .where(and(eq(taskTimeEntries.userId, ctx.userId), isNotNull(tasks.projectId))),
    ]);

    const pinnedTaskIds = new Set(pinnedRows.map((row) => row.taskId));
    const tasksByProject = new Map<string, typeof taskRows>();
    for (const task of taskRows) {
      if (task.projectId === null) continue;
      const list = tasksByProject.get(task.projectId) ?? [];
      list.push(task);
      tasksByProject.set(task.projectId, list);
    }

    const secondsByTask = aggregateSecondsByTask(
      timeEntryRows.map((row) => ({
        taskId: row.taskId,
        startedAt: row.startedAt,
        endedAt: row.endedAt,
      }))
    );
    const taskProjectId = new Map(
      taskRows
        .filter((task): task is typeof task & { projectId: string } => task.projectId !== null)
        .map((task) => [task.id, task.projectId])
    );
    const secondsByProject = new Map<string, number>();
    for (const [taskId, seconds] of Array.from(secondsByTask.entries())) {
      const projectId = taskProjectId.get(taskId);
      if (!projectId || seconds <= 0) continue;
      secondsByProject.set(projectId, (secondsByProject.get(projectId) ?? 0) + seconds);
    }

    return projectRows.map((project) => {
      const projectTasks = tasksByProject.get(project.id) ?? [];
      const progress = weightedProgressForTasks(
        projectTasks.map((task) => ({
          id: task.id,
          completedAt: task.completedAt,
          isTop3: task.isTop3,
        })),
        pinnedTaskIds
      );
      const completedCount = projectTasks.filter((task) => task.completedAt !== null).length;
      return {
        ...project,
        taskCount: projectTasks.length,
        completedCount,
        percent: progress.percent,
        completedWeight: progress.completedWeight,
        totalWeight: progress.totalWeight,
        timeSpentSeconds: secondsByProject.get(project.id) ?? 0,
      };
    });
  }),

  listLooseTaskCountsByCategory: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select({ category: tasks.category })
      .from(tasks)
      .where(and(eq(tasks.userId, ctx.userId), isNull(tasks.projectId)));

    const counts = new Map<ProjectCategory, number>();
    for (const row of rows) {
      counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
    }

    return PROJECT_CATEGORIES.map((category) => ({
      category,
      count: counts.get(category) ?? 0,
    })).filter((row) => row.count > 0);
  }),

  getTimeRollups: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await getOwnedProject(ctx.userId, input.projectId);

      const [taskRows, phaseRows, timeRows] = await Promise.all([
        db
          .select({ id: tasks.id, phaseId: tasks.phaseId })
          .from(tasks)
          .where(and(eq(tasks.userId, ctx.userId), eq(tasks.projectId, input.projectId))),
        db
          .select({ id: phases.id, parentPhaseId: phases.parentPhaseId })
          .from(phases)
          .where(and(eq(phases.userId, ctx.userId), eq(phases.projectId, input.projectId))),
        db
          .select({
            taskId: taskTimeEntries.taskId,
            startedAt: taskTimeEntries.startedAt,
            endedAt: taskTimeEntries.endedAt,
          })
          .from(taskTimeEntries)
          .innerJoin(tasks, eq(taskTimeEntries.taskId, tasks.id))
          .where(and(eq(taskTimeEntries.userId, ctx.userId), eq(tasks.projectId, input.projectId))),
      ]);

      const byTaskSeconds = aggregateSecondsByTask(timeRows);
      return rollupProjectPhaseTime({
        tasks: taskRows,
        phases: phaseRows,
        byTaskSeconds,
      });
    }),

  multiProjectCalendar: protectedProcedure.query(async ({ ctx }) => {
    const [projectRows, phaseRows, taskRows] = await Promise.all([
      db
        .select({
          id: projects.id,
          name: projects.name,
          category: projects.category,
        })
        .from(projects)
        .where(and(eq(projects.userId, ctx.userId), isNull(projects.archivedAt)))
        .orderBy(projects.name),
      db
        .select({
          id: phases.id,
          projectId: phases.projectId,
          parentPhaseId: phases.parentPhaseId,
          name: phases.name,
          sortOrder: phases.sortOrder,
          startDate: phases.startDate,
          endDate: phases.endDate,
          completedAt: phases.completedAt,
        })
        .from(phases)
        .where(eq(phases.userId, ctx.userId)),
      db
        .select({
          projectId: tasks.projectId,
          phaseId: tasks.phaseId,
          sortOrder: tasks.sortOrder,
          scheduledDate: tasks.scheduledDate,
          completedAt: tasks.completedAt,
        })
        .from(tasks)
        .where(and(eq(tasks.userId, ctx.userId), isNotNull(tasks.projectId))),
    ]);

    const calendarTasks = taskRows.flatMap((task) =>
      task.projectId === null ? [] : [{ ...task, projectId: task.projectId }]
    );

    const { span, rows } = buildMultiProjectCalendarRows(projectRows, phaseRows, calendarTasks);

    return {
      projects: projectRows,
      rows,
      span,
    };
  }),

  listTemplates: protectedProcedure
    .input(
      z
        .object({
          similarProjectIds: z.array(z.string().uuid()).max(20).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
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

      const mapped = rows.map((row) => {
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

      const similarIds = input?.similarProjectIds ?? [];
      if (similarIds.length === 0) return mapped;

      const similarForRank = await db
        .select({ name: projects.name, category: projects.category })
        .from(projects)
        .where(and(eq(projects.userId, ctx.userId), inArray(projects.id, similarIds)));

      return rankTemplatesBySimilarProjects(mapped, similarForRank);
    }),

  estimateSampleCount: protectedProcedure
    .input(
      z
        .object({
          similarProjectIds: z.array(z.string().uuid()).max(20).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return countEstimateSamplesForUser(ctx.userId, input?.similarProjectIds);
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
        similarProjectId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const slug = (input.slug ?? slugifyProjectName(input.name)).toLowerCase();

      if (input.similarProjectId) {
        await getOwnedProject(ctx.userId, input.similarProjectId);
      }

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

      try {
        await syncProjectRow(row.id, "insert", row);
      } catch (error) {
        console.error(
          `[projects.create] failed to enqueue sync mutation for project ${row.id}`,
          error instanceof Error ? { cause: error.message, stack: error.stack } : error
        );
        throw error;
      }

      if (input.similarProjectId) {
        await upsertProjectSimilarity({
          userId: ctx.userId,
          projectId: row.id,
          similarProjectId: input.similarProjectId,
          source: "user",
        });
      }

      return row;
    }),

  createFromTemplate: protectedProcedure
    .input(
      z.object({
        templateId: z.string().uuid(),
        name: z.string().min(1).max(120),
        category: categorySchema,
        similarProjectId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const template = await getOwnedTemplate(ctx.userId, input.templateId);
      let structure = projectTemplateStructureSchema.parse(template.structure);
      const slug = slugifyProjectName(input.name).toLowerCase();

      if (input.similarProjectId) {
        await getOwnedProject(ctx.userId, input.similarProjectId);
        structure = await enrichStructureWithSimilarDurations(ctx.userId, structure, [
          input.similarProjectId,
        ]);
      }

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

        if (input.similarProjectId) {
          await upsertProjectSimilarity({
            userId: ctx.userId,
            projectId: project.id,
            similarProjectId: input.similarProjectId,
            source: "user",
          });
        }

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

  archive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedProject(ctx.userId, input.id);

      const [row] = await db
        .update(projects)
        .set({ archivedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(projects.id, input.id), eq(projects.userId, ctx.userId)))
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to archive project.",
        });
      }

      await syncProjectRow(row.id, "update", row);
      return { id: row.id };
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

  proposeSlipReplan: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const proposal = await buildProjectSlipReplanProposal(ctx.userId, input.projectId);
      return proposal;
    }),

  applySlipReplan: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        proposal: replanProjectDatesProposalSchema,
        enabledItemIds: z.array(z.string().min(1)).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await getOwnedProject(ctx.userId, input.projectId);
      const parsed = proposedActionSchema.parse(input.proposal);
      if (parsed.kind !== "replan_project_dates") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Expected a replan proposal." });
      }
      const filtered = filterPayloadByItemIds(parsed, input.enabledItemIds);
      if (!filtered || filtered.kind !== "replan_project_dates") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No enabled phase updates." });
      }
      return applyProjectSlipReplanProposal(ctx.userId, filtered);
    }),

  /** Past projects ranked for the "Like this past one" picker (§5 P2). */
  listSimilarCandidates: protectedProcedure
    .input(
      z.object({
        excludeProjectId: z.string().uuid().optional(),
        embedding: z.array(z.number()).max(4096).optional(),
        preferredCategory: categorySchema.nullable().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return listSimilarCandidatesForUser(ctx.userId, {
        excludeProjectId: input.excludeProjectId,
        embedding: input.embedding,
        preferredCategory: input.preferredCategory ?? null,
      });
    }),

  listSimilarityLinks: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await getOwnedProject(ctx.userId, input.projectId);
      return listProjectSimilarityLinks(ctx.userId, input.projectId);
    }),

  tagSimilar: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        similarProjectId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.projectId === input.similarProjectId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A project cannot be similar to itself.",
        });
      }
      await getOwnedProject(ctx.userId, input.projectId);
      await getOwnedProject(ctx.userId, input.similarProjectId);
      return upsertProjectSimilarity({
        userId: ctx.userId,
        projectId: input.projectId,
        similarProjectId: input.similarProjectId,
        source: "user",
      });
    }),

  untagSimilar: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        similarProjectId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await getOwnedProject(ctx.userId, input.projectId);
      await clearUserSimilarityLink(ctx.userId, input.projectId, input.similarProjectId);
      return { ok: true as const };
    }),

  /**
   * Store a client-computed MiniLM embedding and optionally infer similar past projects.
   * Model never runs server-side (Backlog seam).
   */
  backfillEmbedding: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        embedding: z.array(z.number()).min(1).max(4096),
        inferSimilar: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await getOwnedProject(ctx.userId, input.projectId);
      const updated = await backfillProjectEmbedding(ctx.userId, input.projectId, input.embedding);
      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
      }

      const inferred = input.inferSimilar
        ? await inferAndStoreSimilarProjects(
            ctx.userId,
            input.projectId,
            input.embedding,
            project.category
          )
        : [];

      return { projectId: updated.id, inferred };
    }),
});

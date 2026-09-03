import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import {
  syncProjectFeeRow,
  syncProjectRow,
  syncProjectTemplateRow,
} from "@/db/record-sync-mutation";
import {
  phases,
  projectFees,
  projectTemplates,
  projects,
  targets,
  tasks,
  timeEntries,
  weekDayPriorities,
} from "@/db/tables";
import {
  aggregateSecondsByTask,
  rollupProjectPhaseTime,
} from "@/lib/projects/aggregate-time-rollups";
import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";
import { countEstimateSamplesForUser } from "@/lib/projects/count-estimate-samples";
import { buildMultiProjectCalendarRows } from "@/lib/projects/multi-project-calendar";
import { weightedProgressForTasks } from "@/lib/projects/progress-task-input";
import { slugifyProjectName } from "@/lib/projects/slugify";
import { hasTemplateFeatures } from "@/lib/projects/template-milestone";
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
import { countActiveProjects } from "@/server/projects/count-active";
import { applyProjectTemplate, syncAppliedTemplateRows } from "@/server/projects/apply-template";
import { commitProjectSetup } from "@/server/projects/commit-setup";
import {
  applyProjectSlipReplanProposal,
  buildProjectSlipReplanProposal,
} from "@/server/projects/slip-replan";

import { computeBurnForProjects } from "@/server/projects/compute-project-burn";

import { createTRPCRouter, protectedProcedure } from "../init";

const categorySchema = z.enum(PROJECT_CATEGORIES);
const stateSchema = z.enum(["prospect", "active", "paused", "done"]);

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

/**
 * A project serves at most one Target (W5). Validate the bet is the user's own and
 * still active before linking — met/carried/dropped bets don't take new work. A
 * maintenance project never links (the two are mutually exclusive at the source).
 */
async function resolveTargetLink(
  userId: string,
  targetId: string | null | undefined,
  isMaintenance: boolean
): Promise<string | null> {
  if (isMaintenance || targetId == null) return null;
  const [t] = await db
    .select({ id: targets.id })
    .from(targets)
    .where(and(eq(targets.id, targetId), eq(targets.userId, userId), eq(targets.state, "active")))
    .limit(1);
  if (!t) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "That bet isn't available to link." });
  }
  return targetId;
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
          isLearning: projects.isLearning,
          billingType: projects.billingType,
          updatedAt: projects.updatedAt,
        })
        .from(projects)
        .where(and(eq(projects.userId, ctx.userId), isNull(projects.archivedAt))),
      db
        .select({
          id: tasks.id,
          projectId: tasks.projectId,
          completedAt: tasks.completedAt,
          isTop3: tasks.isTop3,
          updatedAt: tasks.updatedAt,
        })
        .from(tasks)
        .where(and(eq(tasks.userId, ctx.userId), isNotNull(tasks.projectId))),
      db
        .select({ taskId: weekDayPriorities.taskId })
        .from(weekDayPriorities)
        .where(eq(weekDayPriorities.userId, ctx.userId)),
      db
        .select({
          taskId: timeEntries.taskId,
          startedAt: timeEntries.startedAt,
          endedAt: timeEntries.endedAt,
          projectId: tasks.projectId,
        })
        .from(timeEntries)
        .innerJoin(tasks, eq(timeEntries.taskId, tasks.id))
        .where(and(eq(timeEntries.userId, ctx.userId), isNotNull(tasks.projectId))),
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
    const lastActivityByProject = new Map<string, Date>();
    for (const project of projectRows) {
      lastActivityByProject.set(project.id, project.updatedAt);
    }
    for (const task of taskRows) {
      if (task.projectId === null) continue;
      const current = lastActivityByProject.get(task.projectId);
      if (!current || task.updatedAt > current) {
        lastActivityByProject.set(task.projectId, task.updatedAt);
      }
    }
    for (const [taskId, seconds] of Array.from(secondsByTask.entries())) {
      const projectId = taskProjectId.get(taskId);
      if (!projectId || seconds <= 0) continue;
      secondsByProject.set(projectId, (secondsByProject.get(projectId) ?? 0) + seconds);
    }
    for (const row of timeEntryRows) {
      if (!row.projectId) continue;
      const endedAt = row.endedAt ?? row.startedAt;
      const current = lastActivityByProject.get(row.projectId);
      if (!current || endedAt > current) {
        lastActivityByProject.set(row.projectId, endedAt);
      }
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
        lastActivityAt: (lastActivityByProject.get(project.id) ?? project.updatedAt).toISOString(),
      };
    });
  }),

  listLooseTasks: protectedProcedure
    .input(
      z
        .object({
          category: categorySchema.optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(tasks.userId, ctx.userId), isNull(tasks.projectId)];
      if (input?.category) {
        conditions.push(eq(tasks.category, input.category));
      }

      const rows = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          category: tasks.category,
          categoryUnresolved: tasks.categoryUnresolved,
          priority: tasks.priority,
          scheduledDate: tasks.scheduledDate,
          completedAt: tasks.completedAt,
          updatedAt: tasks.updatedAt,
        })
        .from(tasks)
        .where(and(...conditions))
        .orderBy(tasks.updatedAt);

      return rows.map((row) => ({
        ...row,
        completedAt: row.completedAt ? row.completedAt.toISOString() : null,
        updatedAt: row.updatedAt.toISOString(),
      }));
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
            taskId: timeEntries.taskId,
            startedAt: timeEntries.startedAt,
            endedAt: timeEntries.endedAt,
          })
          .from(timeEntries)
          .innerJoin(tasks, eq(timeEntries.taskId, tasks.id))
          .where(and(eq(timeEntries.userId, ctx.userId), eq(tasks.projectId, input.projectId))),
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

  listTemplates: protectedProcedure.query(async ({ ctx }) => {
    const projectCount = await countActiveProjects(ctx.userId);
    if (!hasTemplateFeatures(projectCount)) {
      return [];
    }

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

    return mapped;
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
        clientId: z.string().uuid().nullable().optional(),
        state: stateSchema.optional(),
        isMaintenance: z.boolean().optional(),
        /** The Target this project serves (W5). Ignored when isMaintenance. */
        targetId: z.string().uuid().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const slug = (input.slug ?? slugifyProjectName(input.name)).toLowerCase();
      const targetId = await resolveTargetLink(
        ctx.userId,
        input.targetId,
        input.isMaintenance ?? false
      );

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
            clientId: input.clientId ?? null,
            state: input.state ?? "active",
            isMaintenance: input.isMaintenance ?? false,
            targetId,
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

      return row;
    }),

  createFromTemplate: protectedProcedure
    .input(
      z.object({
        templateId: z.string().uuid(),
        name: z.string().min(1).max(120),
        category: categorySchema,
        isMaintenance: z.boolean().optional(),
        targetId: z.string().uuid().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const template = await getOwnedTemplate(ctx.userId, input.templateId);
      const structure = projectTemplateStructureSchema.parse(template.structure);
      const slug = slugifyProjectName(input.name).toLowerCase();
      const targetId = await resolveTargetLink(
        ctx.userId,
        input.targetId,
        input.isMaintenance ?? false
      );

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
              isMaintenance: input.isMaintenance ?? false,
              targetId,
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
      const projectCount = await countActiveProjects(ctx.userId);
      if (!hasTemplateFeatures(projectCount)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Template features unlock after creating 10 projects.",
        });
      }

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
        clientId: z.string().uuid().nullable().optional(),
        state: stateSchema.optional(),
        isMaintenance: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await getOwnedProject(ctx.userId, input.id);

      const patch: Partial<typeof projects.$inferInsert> = { updatedAt: new Date() };
      if (input.name !== undefined) patch.name = input.name.trim();
      if (input.category !== undefined) patch.category = input.category;
      if (input.clientId !== undefined) patch.clientId = input.clientId;
      if (input.state !== undefined) patch.state = input.state;
      if (input.isMaintenance !== undefined) patch.isMaintenance = input.isMaintenance;

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

  commitSetup: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        project: z
          .object({
            name: z.string().min(1).max(120).optional(),
            category: categorySchema.optional(),
          })
          .optional(),
        phases: z.array(
          z.object({
            key: z.string().min(1),
            id: z.string().uuid().nullable().optional(),
            name: z.string().min(1).max(200),
            startDate: z
              .string()
              .regex(/^\d{4}-\d{2}-\d{2}$/)
              .nullable()
              .optional(),
            endDate: z
              .string()
              .regex(/^\d{4}-\d{2}-\d{2}$/)
              .nullable()
              .optional(),
          })
        ),
        milestones: z.array(
          z.object({
            id: z.string().uuid().nullable().optional(),
            title: z.string().min(1).max(200),
            targetDate: z
              .string()
              .regex(/^\d{4}-\d{2}-\d{2}$/)
              .nullable()
              .optional(),
          })
        ),
        taskSeeds: z.array(
          z
            .object({
              phaseKey: z.string().min(1).optional(),
              phaseId: z.string().uuid().optional(),
              title: z.string().min(1).max(500),
              suggestedScheduledDate: z
                .string()
                .regex(/^\d{4}-\d{2}-\d{2}$/)
                .nullable()
                .optional(),
            })
            .refine((seed) => seed.phaseKey != null || seed.phaseId != null, {
              message: "Each task seed must reference a phaseKey or phaseId.",
            })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return commitProjectSetup(ctx.userId, input);
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

  /**
   * W15 — estimate vs actual for the whole board, or one project.
   *
   * Derived at read from the estimate, the time log and task completion; nothing is
   * stored, so the three numbers underneath can never drift out of step with a cached
   * fourth. The money half arrives in its own `fee` field for the fixed-fee case.
   */
  burn: protectedProcedure
    .input(z.object({ projectId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return computeBurnForProjects(ctx.userId, input?.projectId ? [input.projectId] : undefined);
    }),

  /** How the work is sold. A work-fact, so it lives on the project itself. */
  setBillingType: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        billingType: z.enum(["hourly", "fixed_fee"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .update(projects)
        .set({ billingType: input.billingType, updatedAt: new Date() })
        .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
      await syncProjectRow(row.id, "update", row);
      return row;
    }),

  /**
   * The fixed fee and the rate floor beneath it (W15). Both are money, so they land
   * in `project_fees` (financial-class) — never on the org_shared project row.
   *
   * The floor is a judgement about THIS engagement, not a copy of your standard rate:
   * a project can sit below your usual number and still be worth taking, and deriving
   * the floor would erase that decision.
   */
  setFee: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        feeAmountCents: z.number().int().min(0).max(100_000_000).nullable(),
        targetRateFloorCents: z.number().int().min(0).max(1_000_000).nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [owned] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)))
        .limit(1);
      if (!owned) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });

      const now = new Date();
      const [existing] = await db
        .select({ id: projectFees.id })
        .from(projectFees)
        .where(and(eq(projectFees.userId, ctx.userId), eq(projectFees.projectId, input.projectId)))
        .limit(1);

      let row;
      if (existing) {
        [row] = await db
          .update(projectFees)
          .set({
            feeAmountCents: input.feeAmountCents,
            targetRateFloorCents: input.targetRateFloorCents,
            updatedAt: now,
          })
          .where(and(eq(projectFees.id, existing.id), eq(projectFees.userId, ctx.userId)))
          .returning();
      } else {
        [row] = await db
          .insert(projectFees)
          .values({
            userId: ctx.userId,
            orgId: ctx.orgId,
            projectId: input.projectId,
            feeAmountCents: input.feeAmountCents,
            targetRateFloorCents: input.targetRateFloorCents,
          })
          .returning();
      }
      if (!row) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to save the fee." });
      }
      await syncProjectFeeRow(row.id, existing ? "update" : "insert", row);
      return row;
    }),

  /** The stored fee figures for one project. Separate read — it is financial-class. */
  getFee: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await db
        .select({
          feeAmountCents: projectFees.feeAmountCents,
          targetRateFloorCents: projectFees.targetRateFloorCents,
          proposalAmountCents: projectFees.proposalAmountCents,
        })
        .from(projectFees)
        .where(and(eq(projectFees.userId, ctx.userId), eq(projectFees.projectId, input.projectId)))
        .limit(1);
      return row ?? null;
    }),
});

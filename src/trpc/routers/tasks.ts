import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  or,
} from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { syncRecurrenceRow, syncTaskRow } from "@/db/record-sync-mutation";
import {
  phases,
  projects,
  taskDependencies,
  taskOccurrenceOverrides,
  taskRecurrence,
  tasks,
} from "@/db/tables";
import { computeDependencyState } from "@/lib/tasks/dependencies/blocked";
import {
  isDateInIsoWeek,
  parseISODateString,
  startOfIsoWeekMonday,
  startOfLocalDay,
  toISODateString,
} from "@/lib/dates/local-day";
import { PROJECT_CATEGORIES } from "@/lib/projects/categories";
import { bucketToSchedulingFields } from "@/lib/tasks/bucket-scheduling";
import {
  resolveTaskCategoryForUser,
  setLastUsedCategory,
} from "@/server/tasks/resolve-task-category";
import { mergeRecurringIntoPlanList } from "@/server/tasks/merge-recurring-into-plan-list";
import type { OccurrenceOverrideInput } from "@/lib/recurrence/types";
import { isExpiredTop3, isTop3ActiveForLocalDate } from "@/lib/tasks/top3-local-day";
import {
  validateWeekDraftAssignments,
  type WeekDraftAssignment,
} from "@/lib/week/validate-week-draft-assignments";
import { weekDraftValidationContextFromSource } from "@/lib/week/week-draft-validation-context";
import { fetchWeekDraftContext } from "@/server/claude/fetch-week-draft-context";
import { applyScheduleBatch } from "@/server/tasks/apply-schedule-batch";
import { clearWeekDayPrioritiesForTask } from "./week-day-priorities";

import { createTRPCRouter, protectedProcedure } from "../init";

const localCalendarInputSchema = z.object({
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tzOffsetMinutes: z.number().int().min(-840).max(840),
});

const categorySchema = z.enum(PROJECT_CATEGORIES);

function triageCandidatesWhere(userId: string, todayIso: string) {
  return and(
    eq(tasks.userId, userId),
    isNull(tasks.completedAt),
    isNotNull(tasks.scheduledDate),
    lt(tasks.scheduledDate, todayIso),
    or(isNull(tasks.bucketOverride), ne(tasks.bucketOverride, "later"))
  );
}

const taskSnapshotSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  priority: z.number().int().min(0).max(3),
  scheduledDate: z.string().nullable(),
  bucketOverride: z.string().nullable(),
  projectId: z.string().uuid().nullable(),
  isTop3: z.boolean(),
  top3Order: z.number().int().nullable(),
  // Q1: undo = "put it back exactly" — carry the resolved category and its
  // unresolved marker through delete → restore unchanged (no re-resolution).
  // category is NOT NULL on tasks (1B), so a deleted row always carries one.
  category: categorySchema,
  categoryUnresolved: z.boolean(),
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
  listIncomplete: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        priority: tasks.priority,
        scheduledDate: tasks.scheduledDate,
        bucketOverride: tasks.bucketOverride,
        projectId: tasks.projectId,
        phaseId: tasks.phaseId,
        isTop3: tasks.isTop3,
        top3Order: tasks.top3Order,
        completedAt: tasks.completedAt,
        createdAt: tasks.createdAt,
        category: tasks.category,
        categoryUnresolved: tasks.categoryUnresolved,
        projectSlug: projects.slug,
        projectName: projects.name,
        phaseName: phases.name,
        phaseSortOrder: phases.sortOrder,
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .leftJoin(phases, eq(tasks.phaseId, phases.id))
      .where(and(eq(tasks.userId, ctx.userId), isNull(tasks.completedAt)))
      .orderBy(desc(tasks.priority), asc(tasks.createdAt));

    const recurrenceRows = await db
      .select({
        recurrenceId: taskRecurrence.id,
        taskId: taskRecurrence.taskId,
        rrule: taskRecurrence.rrule,
        startDate: taskRecurrence.startDate,
        title: tasks.title,
        priority: tasks.priority,
        bucketOverride: tasks.bucketOverride,
        projectId: tasks.projectId,
        phaseId: tasks.phaseId,
        isTop3: tasks.isTop3,
        top3Order: tasks.top3Order,
        completedAt: tasks.completedAt,
        createdAt: tasks.createdAt,
        category: tasks.category,
        categoryUnresolved: tasks.categoryUnresolved,
        projectSlug: projects.slug,
        projectName: projects.name,
        phaseName: phases.name,
        phaseSortOrder: phases.sortOrder,
      })
      .from(taskRecurrence)
      .innerJoin(tasks, eq(taskRecurrence.taskId, tasks.id))
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .leftJoin(phases, eq(tasks.phaseId, phases.id))
      .where(and(eq(taskRecurrence.userId, ctx.userId), isNull(tasks.completedAt)));

    const recurrenceIds = recurrenceRows.map((r) => r.recurrenceId);
    const overrideRows =
      recurrenceIds.length === 0
        ? []
        : await db
            .select({
              recurrenceId: taskOccurrenceOverrides.recurrenceId,
              occurrenceDate: taskOccurrenceOverrides.occurrenceDate,
              status: taskOccurrenceOverrides.status,
              movedToDate: taskOccurrenceOverrides.movedToDate,
              patch: taskOccurrenceOverrides.patch,
              completedAt: taskOccurrenceOverrides.completedAt,
            })
            .from(taskOccurrenceOverrides)
            .where(
              and(
                eq(taskOccurrenceOverrides.userId, ctx.userId),
                inArray(taskOccurrenceOverrides.recurrenceId, recurrenceIds)
              )
            );

    const overridesByRecurrence = new Map<string, OccurrenceOverrideInput[]>();
    for (const override of overrideRows) {
      const list = overridesByRecurrence.get(override.recurrenceId) ?? [];
      list.push({
        occurrenceDate: override.occurrenceDate,
        status: override.status,
        movedToDate: override.movedToDate,
        patch: (override.patch as Record<string, unknown> | null) ?? null,
        completedAt: override.completedAt,
      });
      overridesByRecurrence.set(override.recurrenceId, list);
    }

    const mergedRows = mergeRecurringIntoPlanList({
      rows,
      templates: recurrenceRows.map((r) => ({
        recurrenceId: r.recurrenceId,
        taskId: r.taskId,
        rrule: r.rrule,
        startDate: r.startDate,
        title: r.title,
        priority: r.priority,
        bucketOverride: r.bucketOverride,
        projectId: r.projectId,
        phaseId: r.phaseId,
        isTop3: r.isTop3,
        top3Order: r.top3Order,
        completedAt: r.completedAt,
        createdAt: r.createdAt,
        category: r.category,
        categoryUnresolved: r.categoryUnresolved,
        projectSlug: r.projectSlug,
        projectName: r.projectName,
        phaseName: r.phaseName,
        phaseSortOrder: r.phaseSortOrder,
      })),
      overridesByRecurrence,
    });

    // Phase 3: surface live dependency state (isBlocked drives RDM-skip, unblocksCount
    // drives blocker weight). Dependency ids use template task ids for occurrences.
    const edges = await db
      .select({
        blockerTaskId: taskDependencies.blockerTaskId,
        blockedTaskId: taskDependencies.blockedTaskId,
        expiresAt: taskDependencies.expiresAt,
      })
      .from(taskDependencies)
      .where(eq(taskDependencies.userId, ctx.userId));

    const depTaskIds = mergedRows.map((r) => r.templateTaskId ?? r.id);
    const depState = computeDependencyState(edges, depTaskIds);

    return mergedRows.map((row) => {
      const depId = row.templateTaskId ?? row.id;
      const state = depState.get(depId);
      return {
        ...row,
        isBlocked: state?.isBlocked ?? false,
        blockedByIds: state?.blockedByIds ?? [],
        unblocksCount: state?.unblocksCount ?? 0,
      };
    });
  }),

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

  countTriageCandidates: protectedProcedure.query(async ({ ctx }) => {
    const todayIso = toISODateString(startOfLocalDay());

    const [row] = await db
      .select({ count: count() })
      .from(tasks)
      .where(triageCandidatesWhere(ctx.userId, todayIso));

    return { count: Number(row?.count ?? 0) };
  }),

  listTriageCandidates: protectedProcedure.query(async ({ ctx }) => {
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
        category: tasks.category,
        categoryUnresolved: tasks.categoryUnresolved,
        projectSlug: projects.slug,
        projectName: projects.name,
        phaseName: phases.name,
        phaseSortOrder: phases.sortOrder,
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .leftJoin(phases, eq(tasks.phaseId, phases.id))
      .where(triageCandidatesWhere(ctx.userId, todayIso))
      .orderBy(desc(tasks.priority), asc(tasks.createdAt));

    return rows;
  }),

  listTop3Slots: protectedProcedure
    .input(localCalendarInputSchema)
    .query(async ({ ctx, input }) => {
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
          top3PinnedAt: tasks.top3PinnedAt,
          completedAt: tasks.completedAt,
          createdAt: tasks.createdAt,
          projectSlug: projects.slug,
          projectName: projects.name,
          category: tasks.category,
          categoryUnresolved: tasks.categoryUnresolved,
        })
        .from(tasks)
        .leftJoin(projects, eq(tasks.projectId, projects.id))
        .where(
          and(eq(tasks.userId, ctx.userId), eq(tasks.isTop3, true), isNotNull(tasks.top3Order))
        )
        .orderBy(asc(tasks.top3Order));

      return rows.filter((row) =>
        isTop3ActiveForLocalDate(row, input.localDate, input.tzOffsetMinutes)
      );
    }),

  clearExpiredTop3: protectedProcedure
    .input(localCalendarInputSchema)
    .mutation(async ({ ctx, input }) => {
      const rows = await db
        .select({
          id: tasks.id,
          top3PinnedAt: tasks.top3PinnedAt,
          scheduledDate: tasks.scheduledDate,
        })
        .from(tasks)
        .where(
          and(eq(tasks.userId, ctx.userId), eq(tasks.isTop3, true), isNotNull(tasks.top3Order))
        );

      const expiredIds = rows
        .filter((row) => isExpiredTop3(row, input.localDate, input.tzOffsetMinutes))
        .map((row) => row.id);

      if (expiredIds.length === 0) {
        return { clearedCount: 0 };
      }

      const now = new Date();
      const updatedRows = await db
        .update(tasks)
        .set({
          isTop3: false,
          top3Order: null,
          top3PinnedAt: null,
          updatedAt: now,
        })
        .where(and(eq(tasks.userId, ctx.userId), inArray(tasks.id, expiredIds)))
        .returning();

      for (const row of updatedRows) {
        await syncTaskRow(row.id, "update", row);
      }

      return { clearedCount: updatedRows.length };
    }),

  pinTop3: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        slot: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await getOwnedTask(ctx.userId, input.id);
      const now = new Date();
      const todayFields = bucketToSchedulingFields("today");

      await db
        .update(tasks)
        .set({
          isTop3: false,
          top3Order: null,
          top3PinnedAt: null,
          updatedAt: now,
        })
        .where(
          and(
            eq(tasks.userId, ctx.userId),
            eq(tasks.isTop3, true),
            eq(tasks.top3Order, input.slot),
            ne(tasks.id, input.id)
          )
        );

      const [row] = await db
        .update(tasks)
        .set({
          isTop3: true,
          top3Order: input.slot,
          top3PinnedAt: now,
          scheduledDate: todayFields.scheduledDate,
          bucketOverride: todayFields.bucketOverride,
          updatedAt: now,
        })
        .where(and(eq(tasks.id, input.id), eq(tasks.userId, ctx.userId)))
        .returning();

      if (!row) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to pin task." });
      }

      await syncTaskRow(row.id, "update", row);
      return row;
    }),

  unpinTop3: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedTask(ctx.userId, input.id);
      const now = new Date();

      const [row] = await db
        .update(tasks)
        .set({
          isTop3: false,
          top3Order: null,
          top3PinnedAt: null,
          updatedAt: now,
        })
        .where(and(eq(tasks.id, input.id), eq(tasks.userId, ctx.userId)))
        .returning();

      if (!row) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to unpin task." });
      }

      await syncTaskRow(row.id, "update", row);
      return row;
    }),

  scheduleToDate: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        scheduledDate: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await getOwnedTask(ctx.userId, input.id);

      if (input.scheduledDate !== null && !isDateInIsoWeek(input.scheduledDate)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "scheduledDate must be within the current calendar week.",
        });
      }

      const patch: Partial<typeof tasks.$inferInsert> = {
        scheduledDate: input.scheduledDate,
        updatedAt: new Date(),
      };

      if (input.scheduledDate !== null) {
        patch.bucketOverride = null;
      }

      const [row] = await db
        .update(tasks)
        .set(patch)
        .where(and(eq(tasks.id, input.id), eq(tasks.userId, ctx.userId)))
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to schedule task.",
        });
      }

      await clearWeekDayPrioritiesForTask(ctx.userId, input.id, {
        exceptDate: input.scheduledDate ?? undefined,
      });

      return row;
    }),

  applyWeekDraft: protectedProcedure
    .input(
      z.object({
        assignments: z.array(
          z.object({
            taskId: z.string().uuid(),
            scheduledDate: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.assignments.length === 0) {
        return { applied: 0 };
      }

      const uniqueIds = Array.from(new Set(input.assignments.map((a) => a.taskId)));
      const ownedRows = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.userId, ctx.userId), inArray(tasks.id, uniqueIds)));

      const ownedSet = new Set(ownedRows.map((r) => r.id));
      const firstDate = input.assignments[0]!.scheduledDate;
      const weekStart = toISODateString(startOfIsoWeekMonday(parseISODateString(firstDate)));
      const draftContext = await fetchWeekDraftContext(ctx.userId, weekStart);

      const validation = validateWeekDraftAssignments(
        input.assignments as WeekDraftAssignment[],
        ownedSet,
        parseISODateString(weekStart),
        weekDraftValidationContextFromSource(draftContext)
      );

      if (!validation.ok) {
        const message =
          validation.error === "UNKNOWN_TASK"
            ? "One or more tasks were not found."
            : validation.error === "DUPLICATE_TASK"
              ? "Duplicate task in draft."
              : validation.error === "DAY_OVER_CAPACITY"
                ? "One or more days would be over capacity with protected blocks."
                : validation.error === "HARD_CONSTRAINT_VIOLATION"
                  ? "One or more assignments overlap a hard personal constraint."
                  : "One or more dates are outside the current week.";
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }

      const now = new Date();
      for (const row of validation.normalized) {
        await db
          .update(tasks)
          .set({
            scheduledDate: row.scheduledDate,
            bucketOverride: null,
            updatedAt: now,
          })
          .where(and(eq(tasks.id, row.taskId), eq(tasks.userId, ctx.userId)));
      }

      return { applied: validation.normalized.length };
    }),

  applyScheduleBatch: protectedProcedure
    .input(
      z.object({
        assignments: z.array(
          z.object({
            taskId: z.string().uuid(),
            scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return applyScheduleBatch(ctx.userId, input.assignments);
    }),

  moveToBucket: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        bucket: z.enum(["today", "tomorrow", "this_week", "later"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await getOwnedTask(ctx.userId, input.id);

      const fields = bucketToSchedulingFields(input.bucket);

      const [row] = await db
        .update(tasks)
        .set({
          scheduledDate: fields.scheduledDate,
          bucketOverride: fields.bucketOverride,
          updatedAt: new Date(),
        })
        .where(and(eq(tasks.id, input.id), eq(tasks.userId, ctx.userId)))
        .returning();

      if (!row) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to move task." });
      }

      await syncTaskRow(row.id, "update", row);
      return row;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(500),
        scheduledDate: z.string().nullable().optional(),
        bucketOverride: z.enum(["later"]).nullable().optional(),
        projectId: z.string().uuid().nullable().optional(),
        phaseId: z.string().uuid().nullable().optional(),
        priority: z.number().int().min(0).max(3).default(0),
        category: categorySchema.optional(),
        milestoneId: z.string().uuid().nullable().optional(),
        timeEstimateMinutes: z
          .number()
          .int()
          .min(1)
          .max(24 * 60)
          .nullable()
          .optional(),
        /** RRULE body (without `RRULE:` prefix) — Phase 4 composer / picker. */
        rrule: z.string().min(1).max(2000).optional(),
        recurrenceStartDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const todayIso = toISODateString(startOfLocalDay());
      const hasRecurrence = Boolean(input.rrule);
      const recurrenceStart =
        input.recurrenceStartDate ??
        (input.scheduledDate && input.bucketOverride !== "later" ? input.scheduledDate : todayIso);
      const scheduledDate = hasRecurrence
        ? null
        : input.bucketOverride === "later"
          ? null
          : (input.scheduledDate ?? todayIso);
      const title = input.title.trim();

      // Phase 1 (1.4a): run the shared resolver ladder for every create.
      const resolved = await resolveTaskCategoryForUser({
        userId: ctx.userId,
        title,
        explicit: input.category ?? null,
        projectId: input.projectId ?? null,
      });

      const [row] = await db
        .insert(tasks)
        .values({
          userId: ctx.userId,
          title,
          scheduledDate,
          bucketOverride: input.bucketOverride ?? null,
          projectId: input.projectId ?? null,
          phaseId: input.phaseId ?? null,
          milestoneId: input.milestoneId ?? null,
          timeEstimateMinutes: input.timeEstimateMinutes ?? null,
          priority: input.priority,
          category: resolved.category,
          categoryUnresolved: resolved.unresolved,
        })
        .returning();

      if (!row) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create task." });
      }

      // Habit layer: remember a real category only (skip the unresolved fallback).
      if (!resolved.unresolved) {
        await setLastUsedCategory(ctx.userId, resolved.category);
      }

      await syncTaskRow(row.id, "insert", row);

      if (input.rrule) {
        const [recurrence] = await db
          .insert(taskRecurrence)
          .values({
            userId: ctx.userId,
            taskId: row.id,
            rrule: input.rrule,
            startDate: recurrenceStart,
          })
          .returning();

        if (recurrence) {
          await syncRecurrenceRow(recurrence.id, "insert", recurrence);
        }
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
          category: input.category,
          categoryUnresolved: input.categoryUnresolved,
        })
        .returning();

      if (!row) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to restore task." });
      }

      await syncTaskRow(row.id, "insert", row);
      return row;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(500).optional(),
        priority: z.number().int().min(0).max(3).optional(),
        projectId: z.string().uuid().nullable().optional(),
        phaseId: z.string().uuid().nullable().optional(),
        category: categorySchema.optional(),
        milestoneId: z.string().uuid().nullable().optional(),
        timeEstimateMinutes: z
          .number()
          .int()
          .min(1)
          .max(24 * 60)
          .nullable()
          .optional(),
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
      if (input.phaseId !== undefined) patch.phaseId = input.phaseId;
      if (input.milestoneId !== undefined) patch.milestoneId = input.milestoneId;
      if (input.timeEstimateMinutes !== undefined) {
        patch.timeEstimateMinutes = input.timeEstimateMinutes;
      }
      // Explicit category edit is a layer-1 assignment: set it and clear the
      // unresolved flag so the row leaves the invisible-plumbing state (1.4d).
      if (input.category !== undefined) {
        patch.category = input.category;
        patch.categoryUnresolved = false;
      }

      const [row] = await db
        .update(tasks)
        .set(patch)
        .where(and(eq(tasks.id, input.id), eq(tasks.userId, ctx.userId)))
        .returning();

      if (!row) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update task." });
      }

      await syncTaskRow(row.id, "update", row);
      return row;
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

      if (!row) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to complete task." });
      }

      await syncTaskRow(row.id, "update", row);
      return {
        task: row,
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

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to uncomplete task.",
        });
      }

      await syncTaskRow(row.id, "update", row);
      return row;
    }),

  listRecentlyCompleted: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        completedAt: tasks.completedAt,
        projectSlug: projects.slug,
        category: tasks.category,
        categoryUnresolved: tasks.categoryUnresolved,
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(and(eq(tasks.userId, ctx.userId), isNotNull(tasks.completedAt)))
      .orderBy(desc(tasks.completedAt))
      .limit(30);

    return rows;
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getOwnedTask(ctx.userId, input.id);

      await db.delete(tasks).where(and(eq(tasks.id, input.id), eq(tasks.userId, ctx.userId)));

      await syncTaskRow(input.id, "delete", { id: input.id, userId: ctx.userId });

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
          category: existing.category,
          categoryUnresolved: existing.categoryUnresolved,
        },
      };
    }),

  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return db
        .select({
          id: tasks.id,
          title: tasks.title,
          priority: tasks.priority,
          scheduledDate: tasks.scheduledDate,
          bucketOverride: tasks.bucketOverride,
          projectId: tasks.projectId,
          phaseId: tasks.phaseId,
          sortOrder: tasks.sortOrder,
          isTop3: tasks.isTop3,
          top3Order: tasks.top3Order,
          completedAt: tasks.completedAt,
          createdAt: tasks.createdAt,
          category: tasks.category,
          categoryUnresolved: tasks.categoryUnresolved,
        })
        .from(tasks)
        .where(and(eq(tasks.userId, ctx.userId), eq(tasks.projectId, input.projectId)))
        .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));
    }),

  moveToPhase: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        phaseId: z.string().uuid().nullable(),
        sortOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await getOwnedTask(ctx.userId, input.id);

      const patch: Partial<typeof tasks.$inferInsert> = {
        phaseId: input.phaseId,
        updatedAt: new Date(),
      };
      if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;

      if (input.phaseId !== null) {
        const [phase] = await db
          .select({ projectId: phases.projectId })
          .from(phases)
          .where(and(eq(phases.id, input.phaseId), eq(phases.userId, ctx.userId)))
          .limit(1);
        if (!phase) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Phase not found." });
        }
        patch.projectId = phase.projectId;
      }

      const [row] = await db
        .update(tasks)
        .set(patch)
        .where(and(eq(tasks.id, input.id), eq(tasks.userId, ctx.userId)))
        .returning();

      if (!row) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to move task." });
      }

      await syncTaskRow(row.id, "update", row);
      return row;
    }),
});

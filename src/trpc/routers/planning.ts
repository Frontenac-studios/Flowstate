import { and, asc, eq, gte, inArray, isNotNull, isNull, lt } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { syncPlanningRow, syncProtectedBlockRow, syncTaskRow } from "@/db/record-sync-mutation";
import {
  bingoCards,
  goalMilestones,
  goals,
  monthIntentions,
  phases,
  planningSuggestions,
  projects,
  protectedBlocks,
  quarterThemes,
  reservedDays,
  taskTimeEntries,
  tasks,
} from "@/db/tables";
import { assertEditableBingoCell } from "@/lib/planning/bingo-cells";
import {
  balancePassScopeKey,
  balanceSuggestionLabel,
  computeBalanceFlags,
  weightsFromActivity,
} from "@/lib/planning/balance-pass";
import { checkInDepthSchema, checkInScopeKey } from "@/lib/planning/check-in";
import { templateCheckInSuggestions } from "@/lib/planning/check-in-templates";
import {
  goalProgressPercent,
  milestoneIsComplete,
  type MilestoneProgress,
} from "@/lib/planning/goal-progress";
import { aggregateYearActivity } from "@/lib/planning/year-heat";
import { mockReservedDayDate } from "@/lib/planning/month-calendar";
import { monthsForQuarter } from "@/lib/planning/quarter-months";
import {
  defaultReservedDayLabel,
  protectedBlockCategoryForReservedDay,
} from "@/lib/planning/reserved-day-category";
import { addDays, parseISODateString, toISODateString } from "@/lib/dates/local-day";
import { PROJECT_CATEGORIES, categoryLabel } from "@/lib/projects/categories";
import { slugifyProjectName } from "@/lib/projects/slugify";
import { templateWeekDraft } from "@/lib/week/template-week-draft";
import { fetchAbyssBalanceCandidates } from "@/server/planning/fetch-abyss-balance-candidates";

import { createTRPCRouter, protectedProcedure } from "../init";

const balanceHorizonSchema = z.enum(["week", "month"]);

/** Local calendar month [start, end) as UTC instants for activity queries. */
function monthUtcBounds(
  year: number,
  month: number,
  tzOffsetMinutes: number
): { start: Date; end: Date } {
  const startLocalMidnight = Date.UTC(year, month - 1, 1);
  const endLocalMidnight = Date.UTC(year, month, 1);
  return {
    start: new Date(startLocalMidnight - tzOffsetMinutes * 60_000),
    end: new Date(endLocalMidnight - tzOffsetMinutes * 60_000),
  };
}

/** ISO week [start, end) as UTC instants from Monday anchor. */
function weekUtcBounds(weekStart: string, tzOffsetMinutes: number): { start: Date; end: Date } {
  const monday = parseISODateString(weekStart);
  const startLocalMidnight = Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate());
  const endLocalMidnight = startLocalMidnight + 7 * 86_400_000;
  return {
    start: new Date(startLocalMidnight - tzOffsetMinutes * 60_000),
    end: new Date(endLocalMidnight - tzOffsetMinutes * 60_000),
  };
}

async function categoryActivityForScope(
  userId: string,
  input: {
    horizon: "week" | "month";
    year: number;
    month?: number;
    weekStart?: string;
    tzOffsetMinutes: number;
  }
) {
  const bounds =
    input.horizon === "week" && input.weekStart
      ? weekUtcBounds(input.weekStart, input.tzOffsetMinutes)
      : monthUtcBounds(input.year, input.month ?? 1, input.tzOffsetMinutes);

  const weekDates =
    input.horizon === "week" && input.weekStart
      ? Array.from({ length: 7 }, (_, index) =>
          toISODateString(addDays(parseISODateString(input.weekStart!), index))
        )
      : null;

  const scheduledCondition =
    weekDates != null
      ? and(inArray(tasks.scheduledDate, weekDates), isNull(tasks.completedAt))
      : and(
          gte(tasks.scheduledDate, `${input.year}-${String(input.month).padStart(2, "0")}-01`),
          lt(
            tasks.scheduledDate,
            input.month === 12
              ? `${input.year + 1}-01-01`
              : `${input.year}-${String((input.month ?? 0) + 1).padStart(2, "0")}-01`
          ),
          isNull(tasks.completedAt)
        );

  const [scheduledRows, completedRows] = await Promise.all([
    db
      .select({ category: tasks.category })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), scheduledCondition)),
    db
      .select({ category: tasks.category })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          isNotNull(tasks.completedAt),
          gte(tasks.completedAt, bounds.start),
          lt(tasks.completedAt, bounds.end)
        )
      ),
  ]);

  return weightsFromActivity([...scheduledRows, ...completedRows]);
}

async function statedCategoriesForScope(
  userId: string,
  input: { year: number; month?: number; quarter?: number }
): Promise<Set<(typeof PROJECT_CATEGORIES)[number]>> {
  const stated = new Set<(typeof PROJECT_CATEGORIES)[number]>();

  if (input.month != null) {
    const intentions = await db
      .select({ category: monthIntentions.category, text: monthIntentions.text })
      .from(monthIntentions)
      .where(
        and(
          eq(monthIntentions.userId, userId),
          eq(monthIntentions.year, input.year),
          eq(monthIntentions.month, input.month)
        )
      );
    for (const row of intentions) {
      if (row.text.trim()) stated.add(row.category);
    }
  }

  if (input.quarter != null) {
    const [theme] = await db
      .select({ focusCategories: quarterThemes.focusCategories })
      .from(quarterThemes)
      .where(
        and(
          eq(quarterThemes.userId, userId),
          eq(quarterThemes.year, input.year),
          eq(quarterThemes.quarter, input.quarter)
        )
      )
      .limit(1);
    const focus = theme?.focusCategories;
    if (Array.isArray(focus)) {
      for (const category of focus) {
        if (PROJECT_CATEGORIES.includes(category as (typeof PROJECT_CATEGORIES)[number])) {
          stated.add(category as (typeof PROJECT_CATEGORIES)[number]);
        }
      }
    }
  }

  return stated;
}

const categorySchema = z.enum(PROJECT_CATEGORIES);
const yearSchema = z.number().int().min(2000).max(2100);
const monthSchema = z.number().int().min(1).max(12);
const quarterSchema = z.number().int().min(1).max(4);
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected an ISO date (YYYY-MM-DD).");

const suggestionSurfaceSchema = z.enum([
  "quarter_spread",
  "week_draft",
  "balance_pass",
  "milestone_breakdown",
  "reserved_day",
  "check_in",
  "year_rollover",
]);

const suggestionStatusSchema = z.enum(["pending", "staged", "applied", "dismissed"]);

/** UTC instants for [start, end) of a calendar year in browser-local wall-clock. */
function yearUtcBounds(year: number, tzOffsetMinutes: number): { start: Date; end: Date } {
  const startLocalMidnight = Date.UTC(year, 0, 1);
  const endLocalMidnight = Date.UTC(year + 1, 0, 1);
  return {
    start: new Date(startLocalMidnight - tzOffsetMinutes * 60_000),
    end: new Date(endLocalMidnight - tzOffsetMinutes * 60_000),
  };
}

/** UTC instants for [start, end) of a calendar quarter in browser-local wall-clock. */
function quarterUtcBounds(
  year: number,
  quarter: number,
  tzOffsetMinutes: number
): { start: Date; end: Date } {
  const startMonth = (quarter - 1) * 3;
  const startLocalMidnight = Date.UTC(year, startMonth, 1);
  const endLocalMidnight = Date.UTC(year, startMonth + 3, 1);
  return {
    start: new Date(startLocalMidnight - tzOffsetMinutes * 60_000),
    end: new Date(endLocalMidnight - tzOffsetMinutes * 60_000),
  };
}

async function fetchActivitySourceRows(userId: string, start: Date, end: Date) {
  const [timeRows, completedRows] = await Promise.all([
    db
      .select({
        startedAt: taskTimeEntries.startedAt,
        endedAt: taskTimeEntries.endedAt,
        category: tasks.category,
      })
      .from(taskTimeEntries)
      .innerJoin(tasks, eq(taskTimeEntries.taskId, tasks.id))
      .where(
        and(
          eq(taskTimeEntries.userId, userId),
          gte(taskTimeEntries.startedAt, start),
          lt(taskTimeEntries.startedAt, end)
        )
      ),
    db
      .select({
        completedAt: tasks.completedAt,
        category: tasks.category,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          isNotNull(tasks.completedAt),
          gte(tasks.completedAt, start),
          lt(tasks.completedAt, end)
        )
      ),
  ]);

  const completedTasks = completedRows.flatMap((row) =>
    row.completedAt ? [{ completedAt: row.completedAt, category: row.category }] : []
  );

  return { completedTasks, timeEntries: timeRows };
}

async function syncRow(
  table:
    | "bingo_cards"
    | "goals"
    | "goal_milestones"
    | "quarter_themes"
    | "month_intentions"
    | "reserved_days"
    | "planning_suggestions",
  rowId: string,
  op: "insert" | "update" | "delete",
  payload: unknown
) {
  await syncPlanningRow(table, rowId, op, payload);
}

export const planningRouter = createTRPCRouter({
  getBingoCard: protectedProcedure
    .input(z.object({ cardYear: yearSchema }))
    .query(async ({ ctx, input }) => {
      const [card] = await db
        .select()
        .from(bingoCards)
        .where(and(eq(bingoCards.userId, ctx.userId), eq(bingoCards.cardYear, input.cardYear)))
        .limit(1);
      return card ?? null;
    }),

  getOrCreateBingoCard: protectedProcedure
    .input(z.object({ cardYear: yearSchema }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(bingoCards)
        .where(and(eq(bingoCards.userId, ctx.userId), eq(bingoCards.cardYear, input.cardYear)))
        .limit(1);

      if (existing) return existing;

      const [row] = await db
        .insert(bingoCards)
        .values({ userId: ctx.userId, cardYear: input.cardYear })
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create bingo card.",
        });
      }

      await syncRow("bingo_cards", row.id, "insert", row);
      return row;
    }),

  finalizeBingoCard: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const [row] = await db
        .update(bingoCards)
        .set({ status: "final", finalizedAt: now, updatedAt: now })
        .where(and(eq(bingoCards.id, input.id), eq(bingoCards.userId, ctx.userId)))
        .returning();

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Bingo card not found." });
      }

      await syncRow("bingo_cards", row.id, "update", row);
      return row;
    }),

  listGoals: protectedProcedure
    .input(
      z
        .object({
          bingoCardId: z.string().uuid().optional(),
          cardYear: yearSchema.optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(goals.userId, ctx.userId)];
      if (input?.bingoCardId) {
        conditions.push(eq(goals.bingoCardId, input.bingoCardId));
      }

      const rows = await db
        .select()
        .from(goals)
        .where(and(...conditions))
        .orderBy(asc(goals.sortOrder), asc(goals.createdAt));

      if (input?.cardYear == null) return rows;

      const card = await db
        .select({ id: bingoCards.id })
        .from(bingoCards)
        .where(and(eq(bingoCards.userId, ctx.userId), eq(bingoCards.cardYear, input.cardYear)))
        .limit(1);

      const cardId = card[0]?.id;
      if (!cardId) return [];
      return rows.filter((g) => g.bingoCardId === cardId);
    }),

  createGoal: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(500),
        category: categorySchema,
        bingoCardId: z.string().uuid().optional(),
        cellIndex: z.number().int().min(0).max(24).optional(),
        obligationDesire: z.enum(["obligation", "desire"]).optional(),
        valueId: z.string().uuid().nullable().optional(),
        targetHorizon: z.enum(["year", "quarter", "month"]).optional(),
        targetYear: yearSchema.optional(),
        targetQuarter: quarterSchema.optional(),
        targetMonth: monthSchema.optional(),
        projectId: z.string().uuid().nullable().optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.cellIndex != null) {
        assertEditableBingoCell(input.cellIndex);
      }

      const [row] = await db
        .insert(goals)
        .values({
          userId: ctx.userId,
          title: input.title,
          category: input.category,
          bingoCardId: input.bingoCardId ?? null,
          cellIndex: input.cellIndex ?? null,
          obligationDesire: input.obligationDesire ?? null,
          valueId: input.valueId ?? null,
          targetHorizon: input.targetHorizon ?? null,
          targetYear: input.targetYear ?? null,
          targetQuarter: input.targetQuarter ?? null,
          targetMonth: input.targetMonth ?? null,
          projectId: input.projectId ?? null,
          sortOrder: input.sortOrder ?? 0,
        })
        .returning();

      if (!row) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create goal." });
      }

      await syncRow("goals", row.id, "insert", row);
      return row;
    }),

  updateGoal: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(500).optional(),
        category: categorySchema.optional(),
        cellIndex: z.number().int().min(0).max(24).nullable().optional(),
        obligationDesire: z.enum(["obligation", "desire"]).nullable().optional(),
        valueId: z.string().uuid().nullable().optional(),
        targetHorizon: z.enum(["year", "quarter", "month"]).nullable().optional(),
        targetYear: yearSchema.nullable().optional(),
        targetQuarter: quarterSchema.nullable().optional(),
        targetMonth: monthSchema.nullable().optional(),
        projectId: z.string().uuid().nullable().optional(),
        state: z.enum(["active", "done", "backburnered"]).optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.cellIndex != null) {
        assertEditableBingoCell(input.cellIndex);
      }

      const [existing] = await db
        .select()
        .from(goals)
        .where(and(eq(goals.id, input.id), eq(goals.userId, ctx.userId)))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Goal not found." });
      }

      if (input.title != null && existing.bingoCardId) {
        const [card] = await db
          .select({ status: bingoCards.status })
          .from(bingoCards)
          .where(eq(bingoCards.id, existing.bingoCardId))
          .limit(1);
        if (card?.status === "final") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Goal statement is locked after the bingo card is finalized.",
          });
        }
      }

      const now = new Date();
      const patch: Record<string, unknown> = { updatedAt: now };
      if (input.title !== undefined) patch.title = input.title;
      if (input.category !== undefined) patch.category = input.category;
      if (input.cellIndex !== undefined) patch.cellIndex = input.cellIndex;
      if (input.obligationDesire !== undefined) patch.obligationDesire = input.obligationDesire;
      if (input.valueId !== undefined) patch.valueId = input.valueId;
      if (input.targetHorizon !== undefined) patch.targetHorizon = input.targetHorizon;
      if (input.targetYear !== undefined) patch.targetYear = input.targetYear;
      if (input.targetQuarter !== undefined) patch.targetQuarter = input.targetQuarter;
      if (input.targetMonth !== undefined) patch.targetMonth = input.targetMonth;
      if (input.projectId !== undefined) patch.projectId = input.projectId;
      if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
      if (input.state !== undefined) {
        patch.state = input.state;
        patch.completedAt = input.state === "done" ? now : null;
      }

      const [row] = await db
        .update(goals)
        .set(patch)
        .where(and(eq(goals.id, input.id), eq(goals.userId, ctx.userId)))
        .returning();

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Goal not found." });
      }

      await syncRow("goals", row.id, "update", row);
      return row;
    }),

  removeGoal: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .delete(goals)
        .where(and(eq(goals.id, input.id), eq(goals.userId, ctx.userId)))
        .returning({ id: goals.id });

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Goal not found." });
      }

      await syncRow("goals", row.id, "delete", { id: row.id });
      return row;
    }),

  listMilestones: protectedProcedure
    .input(z.object({ goalId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return db
        .select()
        .from(goalMilestones)
        .where(and(eq(goalMilestones.userId, ctx.userId), eq(goalMilestones.goalId, input.goalId)))
        .orderBy(asc(goalMilestones.sortOrder));
    }),

  createMilestone: protectedProcedure
    .input(
      z.object({
        goalId: z.string().uuid(),
        title: z.string().min(1).max(500),
        sortOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .insert(goalMilestones)
        .values({
          userId: ctx.userId,
          goalId: input.goalId,
          title: input.title,
          sortOrder: input.sortOrder ?? 0,
        })
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create milestone.",
        });
      }

      await syncRow("goal_milestones", row.id, "insert", row);
      return row;
    }),

  updateMilestone: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(500).optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const patch: Record<string, unknown> = { updatedAt: now };
      if (input.title !== undefined) patch.title = input.title;
      if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;

      const [row] = await db
        .update(goalMilestones)
        .set(patch)
        .where(and(eq(goalMilestones.id, input.id), eq(goalMilestones.userId, ctx.userId)))
        .returning();

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Milestone not found." });
      }

      await syncRow("goal_milestones", row.id, "update", row);
      return row;
    }),

  removeMilestone: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .delete(goalMilestones)
        .where(and(eq(goalMilestones.id, input.id), eq(goalMilestones.userId, ctx.userId)))
        .returning({ id: goalMilestones.id });

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Milestone not found." });
      }

      await syncRow("goal_milestones", row.id, "delete", { id: row.id });
      return row;
    }),

  getQuarterTheme: protectedProcedure
    .input(z.object({ year: yearSchema, quarter: quarterSchema }))
    .query(async ({ ctx, input }) => {
      const [row] = await db
        .select()
        .from(quarterThemes)
        .where(
          and(
            eq(quarterThemes.userId, ctx.userId),
            eq(quarterThemes.year, input.year),
            eq(quarterThemes.quarter, input.quarter)
          )
        )
        .limit(1);
      return row ?? null;
    }),

  upsertQuarterTheme: protectedProcedure
    .input(
      z.object({
        year: yearSchema,
        quarter: quarterSchema,
        phrase: z.string().max(500).nullable().optional(),
        focusCategories: z.array(categorySchema).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const [existing] = await db
        .select({ id: quarterThemes.id })
        .from(quarterThemes)
        .where(
          and(
            eq(quarterThemes.userId, ctx.userId),
            eq(quarterThemes.year, input.year),
            eq(quarterThemes.quarter, input.quarter)
          )
        )
        .limit(1);

      const values = {
        phrase: input.phrase ?? null,
        focusCategories: input.focusCategories ?? [],
        updatedAt: now,
      };

      if (existing) {
        const [row] = await db
          .update(quarterThemes)
          .set(values)
          .where(eq(quarterThemes.id, existing.id))
          .returning();
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });
        await syncRow("quarter_themes", row.id, "update", row);
        return row;
      }

      const [row] = await db
        .insert(quarterThemes)
        .values({
          userId: ctx.userId,
          year: input.year,
          quarter: input.quarter,
          ...values,
        })
        .returning();

      if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await syncRow("quarter_themes", row.id, "insert", row);
      return row;
    }),

  listQuarterThemes: protectedProcedure
    .input(z.object({ year: yearSchema }))
    .query(async ({ ctx, input }) => {
      return db
        .select()
        .from(quarterThemes)
        .where(and(eq(quarterThemes.userId, ctx.userId), eq(quarterThemes.year, input.year)))
        .orderBy(asc(quarterThemes.quarter));
    }),

  getYearActivity: protectedProcedure
    .input(
      z.object({
        year: yearSchema,
        tzOffsetMinutes: z.number().int().min(-720).max(840),
      })
    )
    .query(async ({ ctx, input }) => {
      const { start, end } = yearUtcBounds(input.year, input.tzOffsetMinutes);
      const { completedTasks, timeEntries } = await fetchActivitySourceRows(ctx.userId, start, end);

      return aggregateYearActivity({
        year: input.year,
        completedTasks,
        timeEntries,
      });
    }),

  getQuarterActivity: protectedProcedure
    .input(
      z.object({
        year: yearSchema,
        quarter: quarterSchema,
        tzOffsetMinutes: z.number().int().min(-720).max(840),
      })
    )
    .query(async ({ ctx, input }) => {
      const { start, end } = quarterUtcBounds(input.year, input.quarter, input.tzOffsetMinutes);
      const { completedTasks, timeEntries } = await fetchActivitySourceRows(ctx.userId, start, end);

      return aggregateYearActivity({
        year: input.year,
        completedTasks,
        timeEntries,
      }).quarters[input.quarter - 1]!;
    }),

  listMonthIntentions: protectedProcedure
    .input(z.object({ year: yearSchema, month: monthSchema }))
    .query(async ({ ctx, input }) => {
      return db
        .select()
        .from(monthIntentions)
        .where(
          and(
            eq(monthIntentions.userId, ctx.userId),
            eq(monthIntentions.year, input.year),
            eq(monthIntentions.month, input.month)
          )
        )
        .orderBy(asc(monthIntentions.category));
    }),

  upsertMonthIntention: protectedProcedure
    .input(
      z.object({
        year: yearSchema,
        month: monthSchema,
        category: categorySchema,
        text: z.string().max(2000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const [existing] = await db
        .select({ id: monthIntentions.id })
        .from(monthIntentions)
        .where(
          and(
            eq(monthIntentions.userId, ctx.userId),
            eq(monthIntentions.year, input.year),
            eq(monthIntentions.month, input.month),
            eq(monthIntentions.category, input.category)
          )
        )
        .limit(1);

      if (existing) {
        const [row] = await db
          .update(monthIntentions)
          .set({ text: input.text, updatedAt: now })
          .where(eq(monthIntentions.id, existing.id))
          .returning();
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });
        await syncRow("month_intentions", row.id, "update", row);
        return row;
      }

      const [row] = await db
        .insert(monthIntentions)
        .values({
          userId: ctx.userId,
          year: input.year,
          month: input.month,
          category: input.category,
          text: input.text,
        })
        .returning();

      if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await syncRow("month_intentions", row.id, "insert", row);
      return row;
    }),

  listReservedDays: protectedProcedure
    .input(z.object({ year: yearSchema, month: monthSchema }))
    .query(async ({ ctx, input }) => {
      return db
        .select()
        .from(reservedDays)
        .where(
          and(
            eq(reservedDays.userId, ctx.userId),
            eq(reservedDays.year, input.year),
            eq(reservedDays.month, input.month)
          )
        );
    }),

  createReservedDay: protectedProcedure
    .input(
      z.object({
        year: yearSchema,
        month: monthSchema,
        type: z.enum(["outside", "personal"]),
        label: z.string().max(200).nullable().optional(),
        resolvedDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable()
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await db
        .select({ id: reservedDays.id })
        .from(reservedDays)
        .where(
          and(
            eq(reservedDays.userId, ctx.userId),
            eq(reservedDays.year, input.year),
            eq(reservedDays.month, input.month)
          )
        );

      if (existing.length >= 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "At most two reserved days per month.",
        });
      }

      const [row] = await db
        .insert(reservedDays)
        .values({
          userId: ctx.userId,
          year: input.year,
          month: input.month,
          type: input.type,
          label: input.label ?? null,
          resolvedDate: input.resolvedDate ?? null,
        })
        .returning();

      if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await syncRow("reserved_days", row.id, "insert", row);
      return row;
    }),

  updateReservedDay: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        label: z.string().max(200).nullable().optional(),
        resolvedDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable()
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const patch: Record<string, unknown> = { updatedAt: now };
      if (input.label !== undefined) patch.label = input.label;
      if (input.resolvedDate !== undefined) patch.resolvedDate = input.resolvedDate;

      const [row] = await db
        .update(reservedDays)
        .set(patch)
        .where(and(eq(reservedDays.id, input.id), eq(reservedDays.userId, ctx.userId)))
        .returning();

      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await syncRow("reserved_days", row.id, "update", row);
      return row;
    }),

  resolveReservedDay: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        resolvedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const [slot] = await db
        .select()
        .from(reservedDays)
        .where(and(eq(reservedDays.id, input.id), eq(reservedDays.userId, ctx.userId)))
        .limit(1);

      if (!slot) throw new TRPCError({ code: "NOT_FOUND" });

      const category = protectedBlockCategoryForReservedDay(slot.type);
      const label = slot.label ?? defaultReservedDayLabel(slot.type);

      const [block] = await db
        .insert(protectedBlocks)
        .values({
          userId: ctx.userId,
          category,
          scheduledDate: input.resolvedDate,
          label,
          status: "proposed",
        })
        .returning();

      if (!block) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await syncProtectedBlockRow(block.id, "insert", block);

      const [row] = await db
        .update(reservedDays)
        .set({ resolvedDate: input.resolvedDate, updatedAt: now })
        .where(eq(reservedDays.id, slot.id))
        .returning();

      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await syncRow("reserved_days", row.id, "update", row);
      return { reservedDay: row, protectedBlock: block };
    }),

  removeReservedDay: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .delete(reservedDays)
        .where(and(eq(reservedDays.id, input.id), eq(reservedDays.userId, ctx.userId)))
        .returning({ id: reservedDays.id });

      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await syncRow("reserved_days", row.id, "delete", { id: row.id });
      return row;
    }),

  listSuggestions: protectedProcedure
    .input(
      z.object({
        surface: suggestionSurfaceSchema.optional(),
        status: suggestionStatusSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(planningSuggestions.userId, ctx.userId)];
      if (input.surface) conditions.push(eq(planningSuggestions.surface, input.surface));
      if (input.status) conditions.push(eq(planningSuggestions.status, input.status));

      return db
        .select()
        .from(planningSuggestions)
        .where(and(...conditions))
        .orderBy(asc(planningSuggestions.createdAt));
    }),

  createSuggestion: protectedProcedure
    .input(
      z.object({
        surface: suggestionSurfaceSchema,
        payload: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .insert(planningSuggestions)
        .values({
          userId: ctx.userId,
          surface: input.surface,
          payload: input.payload,
        })
        .returning();

      if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await syncRow("planning_suggestions", row.id, "insert", row);
      return row;
    }),

  updateSuggestionStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: suggestionStatusSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const [row] = await db
        .update(planningSuggestions)
        .set({ status: input.status, updatedAt: now })
        .where(
          and(eq(planningSuggestions.id, input.id), eq(planningSuggestions.userId, ctx.userId))
        )
        .returning();

      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await syncRow("planning_suggestions", row.id, "update", row);
      return row;
    }),

  getGoalDetail: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [goal] = await db
        .select()
        .from(goals)
        .where(and(eq(goals.id, input.id), eq(goals.userId, ctx.userId)))
        .limit(1);

      if (!goal) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Goal not found." });
      }

      const milestoneRows = await db
        .select()
        .from(goalMilestones)
        .where(and(eq(goalMilestones.userId, ctx.userId), eq(goalMilestones.goalId, goal.id)))
        .orderBy(asc(goalMilestones.sortOrder));

      const milestoneIds = milestoneRows.map((m) => m.id);
      const linkedTasks =
        milestoneIds.length === 0
          ? []
          : await db
              .select({
                milestoneId: tasks.milestoneId,
                completedAt: tasks.completedAt,
                timeEstimateMinutes: tasks.timeEstimateMinutes,
              })
              .from(tasks)
              .where(and(eq(tasks.userId, ctx.userId), inArray(tasks.milestoneId, milestoneIds)));

      const statsByMilestone = new Map<string, { total: number; completed: number }>();
      for (const id of milestoneIds) statsByMilestone.set(id, { total: 0, completed: 0 });
      for (const task of linkedTasks) {
        if (!task.milestoneId) continue;
        const stats = statsByMilestone.get(task.milestoneId);
        if (!stats) continue;
        stats.total += 1;
        if (task.completedAt) stats.completed += 1;
      }

      const milestones: MilestoneProgress[] = milestoneRows.map((m) => {
        const taskCounts = statsByMilestone.get(m.id) ?? { total: 0, completed: 0 };
        return {
          id: m.id,
          title: m.title,
          sortOrder: m.sortOrder,
          taskCounts,
          isComplete: milestoneIsComplete(taskCounts),
        };
      });

      const taskEstimates = linkedTasks.map((t) => t.timeEstimateMinutes);
      let projectSlug: string | null = null;
      let projectName: string | null = null;
      if (goal.projectId) {
        const [project] = await db
          .select({ slug: projects.slug, name: projects.name })
          .from(projects)
          .where(and(eq(projects.id, goal.projectId), eq(projects.userId, ctx.userId)))
          .limit(1);
        projectSlug = project?.slug ?? null;
        projectName = project?.name ?? null;
      }

      return {
        goal,
        milestones,
        progressPercent: goalProgressPercent(milestones),
        taskEstimates,
        projectSlug,
        projectName,
      };
    }),

  listMilestoneTasks: protectedProcedure
    .input(z.object({ milestoneId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [milestone] = await db
        .select({ id: goalMilestones.id })
        .from(goalMilestones)
        .where(and(eq(goalMilestones.id, input.milestoneId), eq(goalMilestones.userId, ctx.userId)))
        .limit(1);

      if (!milestone) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Milestone not found." });
      }

      return db
        .select({
          id: tasks.id,
          title: tasks.title,
          completedAt: tasks.completedAt,
          timeEstimateMinutes: tasks.timeEstimateMinutes,
          scheduledDate: tasks.scheduledDate,
        })
        .from(tasks)
        .where(and(eq(tasks.userId, ctx.userId), eq(tasks.milestoneId, input.milestoneId)))
        .orderBy(asc(tasks.createdAt));
    }),

  linkTaskToMilestone: protectedProcedure
    .input(
      z.object({
        taskId: z.string().uuid(),
        milestoneId: z.string().uuid().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.milestoneId) {
        const [milestone] = await db
          .select({ id: goalMilestones.id })
          .from(goalMilestones)
          .where(
            and(eq(goalMilestones.id, input.milestoneId), eq(goalMilestones.userId, ctx.userId))
          )
          .limit(1);
        if (!milestone) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Milestone not found." });
        }
      }

      const [row] = await db
        .update(tasks)
        .set({ milestoneId: input.milestoneId, updatedAt: new Date() })
        .where(and(eq(tasks.id, input.taskId), eq(tasks.userId, ctx.userId)))
        .returning();

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found." });
      }

      return row;
    }),

  promoteGoalToProject: protectedProcedure
    .input(z.object({ goalId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [goal] = await db
        .select()
        .from(goals)
        .where(and(eq(goals.id, input.goalId), eq(goals.userId, ctx.userId)))
        .limit(1);

      if (!goal) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Goal not found." });
      }
      if (goal.projectId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Goal already has a backing project.",
        });
      }

      const milestoneRows = await db
        .select()
        .from(goalMilestones)
        .where(and(eq(goalMilestones.goalId, goal.id), eq(goalMilestones.userId, ctx.userId)))
        .orderBy(asc(goalMilestones.sortOrder));

      const slugBase = slugifyProjectName(goal.title);
      let slug = slugBase;
      let suffix = 1;
      while (true) {
        const [existing] = await db
          .select({ id: projects.id })
          .from(projects)
          .where(and(eq(projects.userId, ctx.userId), eq(projects.slug, slug)))
          .limit(1);
        if (!existing) break;
        suffix += 1;
        slug = `${slugBase}-${suffix}`;
      }

      const now = new Date();
      const [project] = await db
        .insert(projects)
        .values({
          userId: ctx.userId,
          name: goal.title,
          slug,
          category: goal.category,
        })
        .returning();

      if (!project) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create project.",
        });
      }

      const phaseIdByMilestone = new Map<string, string>();
      for (const [index, milestone] of Array.from(milestoneRows.entries())) {
        const [phase] = await db
          .insert(phases)
          .values({
            userId: ctx.userId,
            projectId: project.id,
            name: milestone.title,
            sortOrder: index,
          })
          .returning();
        if (phase) phaseIdByMilestone.set(milestone.id, phase.id);
      }

      for (const [milestoneId, phaseId] of Array.from(phaseIdByMilestone.entries())) {
        await db
          .update(tasks)
          .set({ projectId: project.id, phaseId, updatedAt: now })
          .where(and(eq(tasks.userId, ctx.userId), eq(tasks.milestoneId, milestoneId)));
      }

      const [updatedGoal] = await db
        .update(goals)
        .set({ projectId: project.id, updatedAt: now })
        .where(and(eq(goals.id, goal.id), eq(goals.userId, ctx.userId)))
        .returning();

      if (!updatedGoal) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to link goal." });
      }

      await syncRow("goals", updatedGoal.id, "update", updatedGoal);
      return { project, goal: updatedGoal };
    }),

  suggestMilestoneBreakdown: protectedProcedure
    .input(z.object({ goalId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [goal] = await db
        .select({ title: goals.title })
        .from(goals)
        .where(and(eq(goals.id, input.goalId), eq(goals.userId, ctx.userId)))
        .limit(1);

      if (!goal) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Goal not found." });
      }

      const titles = [
        `Research & plan: ${goal.title}`,
        `Execute core work on ${goal.title}`,
        `Finish & review: ${goal.title}`,
      ];

      const rows = await Promise.all(
        titles.map(async (title, index) => {
          const [row] = await db
            .insert(planningSuggestions)
            .values({
              userId: ctx.userId,
              surface: "milestone_breakdown",
              payload: { goalId: input.goalId, title, sortOrder: index },
            })
            .returning();
          return row;
        })
      );

      for (const row of rows) {
        if (row) await syncRow("planning_suggestions", row.id, "insert", row);
      }

      return rows.filter(Boolean);
    }),

  suggestQuarterSpread: protectedProcedure
    .input(z.object({ year: yearSchema, quarter: quarterSchema }))
    .mutation(async ({ ctx, input }) => {
      const goalRows = await db
        .select({
          id: goals.id,
          title: goals.title,
          targetHorizon: goals.targetHorizon,
          targetYear: goals.targetYear,
          targetQuarter: goals.targetQuarter,
          targetMonth: goals.targetMonth,
          state: goals.state,
        })
        .from(goals)
        .where(eq(goals.userId, ctx.userId));

      const unassigned = goalRows.filter(
        (goal) =>
          goal.state === "active" &&
          goal.targetYear === input.year &&
          goal.targetQuarter === input.quarter &&
          goal.targetMonth == null &&
          (goal.targetHorizon === "quarter" || goal.targetHorizon === null)
      );

      if (unassigned.length === 0) {
        return [];
      }

      const months = monthsForQuarter(input.quarter);
      const rows = await Promise.all(
        unassigned.map(async (goal, index) => {
          const targetMonth = months[index % months.length]!;
          const [row] = await db
            .insert(planningSuggestions)
            .values({
              userId: ctx.userId,
              surface: "quarter_spread",
              payload: {
                year: input.year,
                quarter: input.quarter,
                goalId: goal.id,
                goalTitle: goal.title,
                targetMonth,
              },
            })
            .returning();
          return row;
        })
      );

      for (const row of rows) {
        if (row) await syncRow("planning_suggestions", row.id, "insert", row);
      }

      return rows.filter(Boolean);
    }),

  suggestReservedDayDates: protectedProcedure
    .input(z.object({ year: yearSchema, month: monthSchema }))
    .mutation(async ({ ctx, input }) => {
      const slots = await db
        .select()
        .from(reservedDays)
        .where(
          and(
            eq(reservedDays.userId, ctx.userId),
            eq(reservedDays.year, input.year),
            eq(reservedDays.month, input.month)
          )
        );

      const unresolved = slots.filter((slot) => !slot.resolvedDate);
      if (unresolved.length === 0) return [];

      const taken = new Set(
        slots.flatMap((slot) => (slot.resolvedDate ? [slot.resolvedDate] : []))
      );

      const rows = await Promise.all(
        unresolved.map(async (slot) => {
          const suggestedDate = mockReservedDayDate(input.year, input.month, slot.type, taken);
          if (!suggestedDate) return null;
          taken.add(suggestedDate);

          const label = slot.label ?? defaultReservedDayLabel(slot.type);
          const category = protectedBlockCategoryForReservedDay(slot.type);

          const [row] = await db
            .insert(planningSuggestions)
            .values({
              userId: ctx.userId,
              surface: "reserved_day",
              payload: {
                year: input.year,
                month: input.month,
                reservedDayId: slot.id,
                suggestedDate,
                label,
                type: slot.type,
                category,
              },
            })
            .returning();
          return row;
        })
      );

      for (const row of rows) {
        if (row) await syncRow("planning_suggestions", row.id, "insert", row);
      }

      return rows.filter(Boolean);
    }),

  suggestWeekDraft: protectedProcedure
    .input(z.object({ anchorDate: isoDateSchema }))
    .mutation(async ({ ctx, input }) => {
      const inboxRows = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          priority: tasks.priority,
        })
        .from(tasks)
        .where(
          and(eq(tasks.userId, ctx.userId), isNull(tasks.scheduledDate), isNull(tasks.completedAt))
        );

      if (inboxRows.length === 0) {
        return [];
      }

      const weekRef = parseISODateString(input.anchorDate);
      const proposal = templateWeekDraft(inboxRows, weekRef);

      const rows = await Promise.all(
        proposal.assignments.map(async (assignment) => {
          const task = inboxRows.find((row) => row.id === assignment.taskId);
          const [row] = await db
            .insert(planningSuggestions)
            .values({
              userId: ctx.userId,
              surface: "week_draft",
              payload: {
                weekStart: input.anchorDate,
                taskId: assignment.taskId,
                taskTitle: task?.title,
                scheduledDate: assignment.scheduledDate,
              },
            })
            .returning();
          return row;
        })
      );

      for (const row of rows) {
        if (row) await syncRow("planning_suggestions", row.id, "insert", row);
      }

      return rows.filter(Boolean);
    }),

  suggestBalancePass: protectedProcedure
    .input(
      z.object({
        horizon: balanceHorizonSchema,
        year: yearSchema,
        month: monthSchema.optional(),
        quarter: quarterSchema.optional(),
        weekStart: isoDateSchema.optional(),
        tzOffsetMinutes: z.number().int().min(-720).max(840),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.horizon === "week" && !input.weekStart) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "weekStart is required for week balance pass.",
        });
      }
      if (input.horizon === "month" && input.month == null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "month is required for month balance pass.",
        });
      }

      const scopeKey = balancePassScopeKey(input);
      const pendingRows = await db
        .select()
        .from(planningSuggestions)
        .where(
          and(
            eq(planningSuggestions.userId, ctx.userId),
            eq(planningSuggestions.surface, "balance_pass"),
            eq(planningSuggestions.status, "pending")
          )
        );

      const forScope = pendingRows.filter((row) => {
        const payload = row.payload as { scopeKey?: string };
        return payload.scopeKey === scopeKey;
      });
      if (forScope.length > 0) return forScope;

      const categoryWeights = await categoryActivityForScope(ctx.userId, input);
      const stated = await statedCategoriesForScope(ctx.userId, {
        year: input.year,
        month: input.month,
        quarter: input.quarter,
      });

      const flags = computeBalanceFlags(categoryWeights, stated);
      if (flags.length === 0) return [];

      const abyssCandidates = await fetchAbyssBalanceCandidates(
        ctx.userId,
        flags.map((f) => f.category)
      );
      const abyssByCategory = new Map(
        abyssCandidates.map((candidate) => [candidate.category, candidate])
      );

      const rows = await Promise.all(
        flags.map(async (flag) => {
          const abyss = abyssByCategory.get(flag.category);
          const label = balanceSuggestionLabel(
            flag.category,
            categoryLabel(flag.category),
            flag.tier
          );
          const taskTitle = abyss?.title ?? `Small win for ${categoryLabel(flag.category)}`;

          const [row] = await db
            .insert(planningSuggestions)
            .values({
              userId: ctx.userId,
              surface: "balance_pass",
              payload: {
                scopeKey,
                horizon: input.horizon,
                year: input.year,
                month: input.month ?? null,
                quarter: input.quarter ?? null,
                weekStart: input.weekStart ?? null,
                category: flag.category,
                tier: flag.tier,
                rank: flag.rank,
                label,
                taskTitle,
                taskId: abyss?.taskId ?? null,
                source: abyss ? "abyss" : "generated",
              },
            })
            .returning();
          return row;
        })
      );

      for (const row of rows) {
        if (row) await syncRow("planning_suggestions", row.id, "insert", row);
      }

      return rows.filter(Boolean);
    }),

  suggestCheckIn: protectedProcedure
    .input(
      z.object({
        depth: checkInDepthSchema,
        year: yearSchema,
        month: monthSchema.optional(),
        quarter: quarterSchema.optional(),
        weekStart: isoDateSchema.optional(),
        tzOffsetMinutes: z.number().int().min(-720).max(840),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.depth === "week" && !input.weekStart) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "weekStart is required for week check-in.",
        });
      }
      if (input.depth === "month" && input.month == null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "month is required for month check-in.",
        });
      }
      if (input.depth === "quarter" && input.quarter == null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "quarter is required for quarter check-in.",
        });
      }

      const scope = {
        depth: input.depth,
        year: input.year,
        month: input.month,
        quarter: input.quarter,
        weekStart: input.weekStart,
      };
      const scopeKey = checkInScopeKey(scope);

      const pendingRows = await db
        .select()
        .from(planningSuggestions)
        .where(
          and(
            eq(planningSuggestions.userId, ctx.userId),
            eq(planningSuggestions.surface, "check_in"),
            eq(planningSuggestions.status, "pending")
          )
        );

      const forScope = pendingRows.filter((row) => {
        const payload = row.payload as { scopeKey?: string };
        return payload.scopeKey === scopeKey;
      });
      if (forScope.length > 0) return forScope;

      const goalRows = await db
        .select({
          id: goals.id,
          title: goals.title,
          targetHorizon: goals.targetHorizon,
          targetYear: goals.targetYear,
          targetQuarter: goals.targetQuarter,
          targetMonth: goals.targetMonth,
          state: goals.state,
        })
        .from(goals)
        .where(eq(goals.userId, ctx.userId));

      const taskRows = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          scheduledDate: tasks.scheduledDate,
        })
        .from(tasks)
        .where(and(eq(tasks.userId, ctx.userId), isNull(tasks.completedAt)));

      const milestoneRows = await db
        .select({ goalId: goalMilestones.goalId })
        .from(goalMilestones)
        .where(eq(goalMilestones.userId, ctx.userId));

      const proposals = templateCheckInSuggestions(scope, goalRows, taskRows, milestoneRows);

      const rows = await Promise.all(
        proposals.map(async (payload) => {
          const [row] = await db
            .insert(planningSuggestions)
            .values({
              userId: ctx.userId,
              surface: "check_in",
              payload,
            })
            .returning();
          return row;
        })
      );

      for (const row of rows) {
        if (row) await syncRow("planning_suggestions", row.id, "insert", row);
      }

      return rows.filter(Boolean);
    }),

  applyStagedSuggestions: protectedProcedure.mutation(async ({ ctx }) => {
    const now = new Date();
    const staged = await db
      .select()
      .from(planningSuggestions)
      .where(
        and(eq(planningSuggestions.userId, ctx.userId), eq(planningSuggestions.status, "staged"))
      );

    for (const row of staged) {
      if (row.surface === "milestone_breakdown") {
        const payload = row.payload as { goalId?: string; title?: string; sortOrder?: number };
        if (payload.goalId && payload.title) {
          const [created] = await db
            .insert(goalMilestones)
            .values({
              userId: ctx.userId,
              goalId: payload.goalId,
              title: payload.title,
              sortOrder: payload.sortOrder ?? 0,
            })
            .returning();
          if (created) await syncRow("goal_milestones", created.id, "insert", created);
        }
      }

      if (row.surface === "quarter_spread") {
        const payload = row.payload as {
          goalId?: string;
          targetMonth?: number;
          year?: number;
          quarter?: number;
        };
        if (payload.goalId && payload.targetMonth && payload.year && payload.quarter) {
          const [updated] = await db
            .update(goals)
            .set({
              targetHorizon: "month",
              targetYear: payload.year,
              targetQuarter: payload.quarter,
              targetMonth: payload.targetMonth,
              updatedAt: now,
            })
            .where(and(eq(goals.id, payload.goalId), eq(goals.userId, ctx.userId)))
            .returning();
          if (updated) await syncRow("goals", updated.id, "update", updated);
        }
      }

      if (row.surface === "reserved_day") {
        const payload = row.payload as {
          reservedDayId?: string;
          suggestedDate?: string;
          label?: string;
          category?: (typeof PROJECT_CATEGORIES)[number];
        };
        if (payload.reservedDayId && payload.suggestedDate && payload.category) {
          const [block] = await db
            .insert(protectedBlocks)
            .values({
              userId: ctx.userId,
              category: payload.category,
              scheduledDate: payload.suggestedDate,
              label: payload.label ?? null,
              status: "proposed",
            })
            .returning();
          if (block) await syncProtectedBlockRow(block.id, "insert", block);

          const [updatedReserved] = await db
            .update(reservedDays)
            .set({ resolvedDate: payload.suggestedDate, updatedAt: now })
            .where(
              and(eq(reservedDays.id, payload.reservedDayId), eq(reservedDays.userId, ctx.userId))
            )
            .returning();
          if (updatedReserved)
            await syncRow("reserved_days", updatedReserved.id, "update", updatedReserved);
        }
      }

      if (row.surface === "week_draft") {
        const payload = row.payload as { taskId?: string; scheduledDate?: string };
        if (payload.taskId && payload.scheduledDate) {
          await db
            .update(tasks)
            .set({
              scheduledDate: payload.scheduledDate,
              bucketOverride: null,
              updatedAt: now,
            })
            .where(and(eq(tasks.id, payload.taskId), eq(tasks.userId, ctx.userId)));
        }
      }

      if (row.surface === "balance_pass") {
        const payload = row.payload as {
          taskId?: string | null;
          taskTitle?: string;
          category?: (typeof PROJECT_CATEGORIES)[number];
          weekStart?: string | null;
        };
        if (payload.taskId) {
          const patch: Record<string, unknown> = { updatedAt: now, bucketOverride: null };
          if (payload.weekStart) patch.scheduledDate = payload.weekStart;
          await db
            .update(tasks)
            .set(patch)
            .where(and(eq(tasks.id, payload.taskId), eq(tasks.userId, ctx.userId)));
        } else if (payload.taskTitle && payload.category) {
          const [created] = await db
            .insert(tasks)
            .values({
              userId: ctx.userId,
              title: payload.taskTitle,
              category: payload.category,
              scheduledDate: payload.weekStart ?? null,
              bucketOverride: payload.weekStart ? null : "later",
            })
            .returning();
          if (created) await syncTaskRow(created.id, "insert", created);
        }
      }

      if (row.surface === "check_in") {
        const payload = row.payload as {
          action?: "goal_horizon" | "milestone" | "task_schedule";
          goalId?: string;
          milestoneTitle?: string;
          sortOrder?: number;
          taskId?: string;
          scheduledDate?: string;
          targetHorizon?: "quarter" | "month";
          targetYear?: number;
          targetQuarter?: number;
          targetMonth?: number;
          year?: number;
        };

        if (payload.action === "goal_horizon" && payload.goalId && payload.targetHorizon) {
          const [updated] = await db
            .update(goals)
            .set({
              targetHorizon: payload.targetHorizon,
              targetYear: payload.year ?? payload.targetYear,
              targetQuarter: payload.targetQuarter ?? null,
              targetMonth: payload.targetMonth ?? null,
              updatedAt: now,
            })
            .where(and(eq(goals.id, payload.goalId), eq(goals.userId, ctx.userId)))
            .returning();
          if (updated) await syncRow("goals", updated.id, "update", updated);
        }

        if (payload.action === "milestone" && payload.goalId && payload.milestoneTitle) {
          const [created] = await db
            .insert(goalMilestones)
            .values({
              userId: ctx.userId,
              goalId: payload.goalId,
              title: payload.milestoneTitle,
              sortOrder: payload.sortOrder ?? 0,
            })
            .returning();
          if (created) await syncRow("goal_milestones", created.id, "insert", created);
        }

        if (payload.action === "task_schedule" && payload.taskId && payload.scheduledDate) {
          await db
            .update(tasks)
            .set({
              scheduledDate: payload.scheduledDate,
              bucketOverride: null,
              updatedAt: now,
            })
            .where(and(eq(tasks.id, payload.taskId), eq(tasks.userId, ctx.userId)));
        }
      }
    }

    const rows = await db
      .update(planningSuggestions)
      .set({ status: "applied", updatedAt: now })
      .where(
        and(eq(planningSuggestions.userId, ctx.userId), eq(planningSuggestions.status, "staged"))
      )
      .returning();

    for (const row of rows) {
      await syncRow("planning_suggestions", row.id, "update", row);
    }

    return { applied: rows.length };
  }),
});

import { and, asc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { syncPlanningRow } from "@/db/record-sync-mutation";
import {
  bingoCards,
  goalMilestones,
  goals,
  monthIntentions,
  planningSuggestions,
  quarterThemes,
  reservedDays,
} from "@/db/tables";
import { assertEditableBingoCell } from "@/lib/planning/bingo-cells";
import { PROJECT_CATEGORIES } from "@/lib/projects/categories";

import { createTRPCRouter, protectedProcedure } from "../init";

const categorySchema = z.enum(PROJECT_CATEGORIES);
const yearSchema = z.number().int().min(2000).max(2100);
const monthSchema = z.number().int().min(1).max(12);
const quarterSchema = z.number().int().min(1).max(4);

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

  applyStagedSuggestions: protectedProcedure.mutation(async ({ ctx }) => {
    const now = new Date();
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

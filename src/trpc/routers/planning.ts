import { and, eq, gte, isNotNull, lt } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { syncPlanningRow, syncProtectedBlockRow } from "@/db/record-sync-mutation";
import { protectedBlocks, reservedDays, timeEntries, tasks } from "@/db/tables";
import { aggregateYearActivity } from "@/lib/planning/year-heat";
import {
  defaultReservedDayLabel,
  protectedBlockCategoryForReservedDay,
} from "@/lib/planning/reserved-day-category";

import { createTRPCRouter, protectedProcedure } from "../init";

const yearSchema = z.number().int().min(2000).max(2100);
const monthSchema = z.number().int().min(1).max(12);
const quarterSchema = z.number().int().min(1).max(4);

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
        startedAt: timeEntries.startedAt,
        endedAt: timeEntries.endedAt,
        category: tasks.category,
      })
      .from(timeEntries)
      .innerJoin(tasks, eq(timeEntries.taskId, tasks.id))
      .where(
        and(
          eq(timeEntries.userId, userId),
          gte(timeEntries.startedAt, start),
          lt(timeEntries.startedAt, end)
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
  table: "reserved_days",
  rowId: string,
  op: "insert" | "update" | "delete",
  payload: unknown
) {
  await syncPlanningRow(table, rowId, op, payload);
}

export const planningRouter = createTRPCRouter({
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
});

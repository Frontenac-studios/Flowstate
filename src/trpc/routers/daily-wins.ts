import { and, asc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { syncDailyWinRow } from "@/db/record-sync-mutation";
import { dailyWins } from "@/db/tables";
import { isWinDateWritable } from "@/lib/daily-wins/grace-window";
import { dailyWinAuthorSchema, dailyWinSourceSchema, HERO_WIN_SLOTS } from "@/lib/daily-wins/types";
import { fetchDailyWinProposals } from "@/server/daily-wins/fetch-proposals";
import { proposeReflectionBeat } from "@/server/daily-wins/register-hooks";
import { fetchRecentWinHistory } from "@/server/daily-wins/fetch-recent-history";
import { recordGardenNourishForWin } from "@/server/daily-wins/record-garden-nourish";

import { createTRPCRouter, protectedProcedure } from "../init";

const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const tzOffsetSchema = z.number().int().min(-840).max(840);
const heroSlotSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);

function assertWritable(winDate: string, tzOffsetMinutes: number): void {
  if (!isWinDateWritable(winDate, new Date(), tzOffsetMinutes)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This day is read-only outside the grace window.",
    });
  }
}

async function getOwnedWin(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(dailyWins)
    .where(and(eq(dailyWins.id, id), eq(dailyWins.userId, userId)))
    .limit(1);

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Daily win not found." });
  }

  return row;
}

export const dailyWinsRouter = createTRPCRouter({
  listForDate: protectedProcedure
    .input(z.object({ winDate: localDateSchema }))
    .query(async ({ ctx, input }) => {
      return db
        .select()
        .from(dailyWins)
        .where(and(eq(dailyWins.userId, ctx.userId), eq(dailyWins.winDate, input.winDate)))
        .orderBy(asc(dailyWins.slot), asc(dailyWins.createdAt));
    }),

  getDay: protectedProcedure
    .input(
      z.object({
        winDate: localDateSchema,
        tzOffsetMinutes: tzOffsetSchema,
      })
    )
    .query(async ({ ctx, input }) => {
      const rows = await db
        .select()
        .from(dailyWins)
        .where(and(eq(dailyWins.userId, ctx.userId), eq(dailyWins.winDate, input.winDate)))
        .orderBy(asc(dailyWins.slot), asc(dailyWins.createdAt));

      const accepted = rows.filter((row) => row.state === "accepted");
      const slots: ((typeof accepted)[number] | null)[] = HERO_WIN_SLOTS.map((slot) => {
        return accepted.find((row) => row.slot === slot) ?? null;
      });

      return {
        winDate: input.winDate,
        writable: isWinDateWritable(input.winDate, new Date(), input.tzOffsetMinutes),
        rows,
        slots,
        dismissedRefIds: rows
          .filter((row) => row.state === "dismissed" && row.refId)
          .map((row) => row.refId as string),
      };
    }),

  listRecent: protectedProcedure
    .input(
      z.object({
        days: z.number().int().min(1).max(30).default(14),
        hitRateWindow: z.number().int().min(1).max(14).default(7),
        tzOffsetMinutes: tzOffsetSchema,
      })
    )
    .query(async ({ ctx, input }) => {
      return fetchRecentWinHistory(ctx.userId, {
        days: input.days,
        hitRateWindow: input.hitRateWindow,
        tzOffsetMinutes: input.tzOffsetMinutes,
      });
    }),

  getProposals: protectedProcedure
    .input(
      z.object({
        winDate: localDateSchema,
        tzOffsetMinutes: tzOffsetSchema,
      })
    )
    .query(async ({ ctx, input }) => {
      return fetchDailyWinProposals(ctx.userId, input.winDate, input.tzOffsetMinutes);
    }),

  getReflectionBeat: protectedProcedure
    .input(
      z.object({
        winDate: localDateSchema,
        tzOffsetMinutes: tzOffsetSchema,
      })
    )
    .query(async ({ ctx, input }) => {
      return proposeReflectionBeat(ctx.userId, input.winDate, input.tzOffsetMinutes);
    }),

  accept: protectedProcedure
    .input(
      z.object({
        winDate: localDateSchema,
        tzOffsetMinutes: tzOffsetSchema,
        slot: heroSlotSchema,
        source: dailyWinSourceSchema,
        refId: z.string().uuid().nullable().optional(),
        label: z.string().max(500).nullable().optional(),
        author: dailyWinAuthorSchema.default("ai"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertWritable(input.winDate, input.tzOffsetMinutes);

      if (input.source === "manual") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Use addManual for manual wins.",
        });
      }
      if (!input.refId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "refId is required for accepted proposals.",
        });
      }

      const now = new Date();
      const label = input.label?.trim() || null;

      const clearedSlot = await db
        .delete(dailyWins)
        .where(
          and(
            eq(dailyWins.userId, ctx.userId),
            eq(dailyWins.winDate, input.winDate),
            eq(dailyWins.slot, input.slot),
            eq(dailyWins.state, "accepted")
          )
        )
        .returning({ id: dailyWins.id });

      for (const row of clearedSlot) {
        await syncDailyWinRow(row.id, "delete", { id: row.id });
      }

      const [row] = await db
        .insert(dailyWins)
        .values({
          userId: ctx.userId,
          winDate: input.winDate,
          slot: input.slot,
          source: input.source,
          refId: input.refId,
          label,
          state: "accepted",
          author: input.author,
          updatedAt: now,
        })
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to accept daily win.",
        });
      }

      await syncDailyWinRow(row.id, "insert", row);
      await recordGardenNourishForWin(ctx.userId, row.id, input.winDate);
      return row;
    }),

  dismiss: protectedProcedure
    .input(
      z.object({
        winDate: localDateSchema,
        tzOffsetMinutes: tzOffsetSchema,
        source: dailyWinSourceSchema,
        refId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertWritable(input.winDate, input.tzOffsetMinutes);

      if (input.source === "manual") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Manual wins cannot be dismissed as proposals.",
        });
      }

      const now = new Date();

      const [existingDismissed] = await db
        .select({ id: dailyWins.id })
        .from(dailyWins)
        .where(
          and(
            eq(dailyWins.userId, ctx.userId),
            eq(dailyWins.winDate, input.winDate),
            eq(dailyWins.refId, input.refId),
            eq(dailyWins.state, "dismissed")
          )
        )
        .limit(1);

      if (existingDismissed) {
        return { dismissed: true };
      }

      const [row] = await db
        .insert(dailyWins)
        .values({
          userId: ctx.userId,
          winDate: input.winDate,
          slot: null,
          source: input.source,
          refId: input.refId,
          label: null,
          state: "dismissed",
          author: "ai",
          updatedAt: now,
        })
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to dismiss proposal.",
        });
      }

      await syncDailyWinRow(row.id, "insert", row);
      return { dismissed: true };
    }),

  addManual: protectedProcedure
    .input(
      z.object({
        winDate: localDateSchema,
        tzOffsetMinutes: tzOffsetSchema,
        slot: heroSlotSchema,
        label: z.string().trim().min(1).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertWritable(input.winDate, input.tzOffsetMinutes);

      const now = new Date();

      const clearedSlot = await db
        .delete(dailyWins)
        .where(
          and(
            eq(dailyWins.userId, ctx.userId),
            eq(dailyWins.winDate, input.winDate),
            eq(dailyWins.slot, input.slot),
            eq(dailyWins.state, "accepted")
          )
        )
        .returning({ id: dailyWins.id });

      for (const row of clearedSlot) {
        await syncDailyWinRow(row.id, "delete", { id: row.id });
      }

      const [row] = await db
        .insert(dailyWins)
        .values({
          userId: ctx.userId,
          winDate: input.winDate,
          slot: input.slot,
          source: "manual",
          refId: null,
          label: input.label,
          state: "accepted",
          author: "user",
          updatedAt: now,
        })
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add manual win.",
        });
      }

      await syncDailyWinRow(row.id, "insert", row);
      await recordGardenNourishForWin(ctx.userId, row.id, input.winDate);
      return row;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        tzOffsetMinutes: tzOffsetSchema,
        slot: heroSlotSchema.optional(),
        label: z.string().trim().min(1).max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await getOwnedWin(ctx.userId, input.id);
      assertWritable(existing.winDate, input.tzOffsetMinutes);

      if (existing.state !== "accepted") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only accepted wins can be updated.",
        });
      }

      const nextSlot = input.slot ?? existing.slot;
      const nextLabel = input.label !== undefined ? input.label : (existing.label ?? undefined);

      if (nextSlot == null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Accepted wins must keep a slot.",
        });
      }

      if (input.slot != null && input.slot !== existing.slot) {
        const clearedSlot = await db
          .delete(dailyWins)
          .where(
            and(
              eq(dailyWins.userId, ctx.userId),
              eq(dailyWins.winDate, existing.winDate),
              eq(dailyWins.slot, input.slot),
              eq(dailyWins.state, "accepted")
            )
          )
          .returning({ id: dailyWins.id });

        for (const row of clearedSlot) {
          if (row.id !== existing.id) {
            await syncDailyWinRow(row.id, "delete", { id: row.id });
          }
        }
      }

      const now = new Date();
      const [row] = await db
        .update(dailyWins)
        .set({
          slot: nextSlot,
          label: existing.source === "manual" ? (nextLabel ?? existing.label) : existing.label,
          updatedAt: now,
        })
        .where(and(eq(dailyWins.id, input.id), eq(dailyWins.userId, ctx.userId)))
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update daily win.",
        });
      }

      await syncDailyWinRow(row.id, "update", row);
      return row;
    }),

  remove: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        tzOffsetMinutes: tzOffsetSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await getOwnedWin(ctx.userId, input.id);
      assertWritable(existing.winDate, input.tzOffsetMinutes);

      const [row] = await db
        .delete(dailyWins)
        .where(and(eq(dailyWins.id, input.id), eq(dailyWins.userId, ctx.userId)))
        .returning();

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Daily win not found." });
      }

      await syncDailyWinRow(row.id, "delete", { id: row.id });
      return { removed: true };
    }),
});

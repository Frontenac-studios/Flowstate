import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { syncTargetRow } from "@/db/record-sync-mutation";
import { directions, targets } from "@/db/tables";
import { quarterOf } from "@/lib/quarter/quarter-period";

import { createTRPCRouter, protectedProcedure } from "../init";

/** Three bets a quarter — a landed (met) bet still counts, so winning early does
 * not free a slot (§13 Q4). The cap is enforced here; the UI makes it a moment. */
const MAX_TARGETS_PER_QUARTER = 3;

/** States that occupy a slot in the quarter's cap. */
const CAP_STATES = ["active", "met"] as const;

export const targetsRouter = createTRPCRouter({
  /**
   * The bets for the current quarter (active + met), each with its Direction's
   * statement. W5c adds movement, hybrid-measure derivation, and the cards; this
   * is the list the composer and the Directions block read.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const q = quarterOf(new Date());
    return db
      .select({
        id: targets.id,
        directionId: targets.directionId,
        directionStatement: directions.statement,
        title: targets.title,
        horizon: targets.horizon,
        measureKind: targets.measureKind,
        measureSource: targets.measureSource,
        derivationKey: targets.derivationKey,
        measureTarget: targets.measureTarget,
        measureCurrent: targets.measureCurrent,
        state: targets.state,
        periodStart: targets.periodStart,
        periodEnd: targets.periodEnd,
      })
      .from(targets)
      .innerJoin(directions, eq(targets.directionId, directions.id))
      .where(
        and(
          eq(targets.userId, ctx.userId),
          gte(targets.periodStart, q.start),
          lt(targets.periodStart, q.end),
          inArray(targets.state, [...CAP_STATES])
        )
      )
      .orderBy(asc(targets.createdAt));
  }),

  /**
   * Create a bet for the current quarter. Every bet belongs to a Direction (the FK
   * is non-nullable). Measure is `manual` in W5b; the hybrid `auto` derivation lands
   * in W5c. Cap of three per quarter is enforced here as a named failure.
   */
  create: protectedProcedure
    .input(
      z.object({
        directionId: z.string().uuid(),
        title: z.string().trim().min(1).max(200),
        measureKind: z.enum(["currency", "count", "shipped"]),
        measureTarget: z.number().int().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // The Direction must be the caller's own (and live) — a bet can't hang off
      // someone else's rule or a retired one.
      const [direction] = await db
        .select({ id: directions.id })
        .from(directions)
        .where(and(eq(directions.id, input.directionId), eq(directions.userId, ctx.userId)))
        .limit(1);
      if (!direction) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Direction not found." });
      }

      const q = quarterOf(new Date());

      const occupying = await db
        .select({ id: targets.id })
        .from(targets)
        .where(
          and(
            eq(targets.userId, ctx.userId),
            gte(targets.periodStart, q.start),
            lt(targets.periodStart, q.end),
            inArray(targets.state, [...CAP_STATES])
          )
        );
      if (occupying.length >= MAX_TARGETS_PER_QUARTER) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `You already have ${MAX_TARGETS_PER_QUARTER} bets this quarter. Retire one before adding another.`,
        });
      }

      const [row] = await db
        .insert(targets)
        .values({
          userId: ctx.userId,
          orgId: ctx.orgId,
          directionId: input.directionId,
          title: input.title,
          horizon: "quarter",
          periodStart: q.start,
          periodEnd: q.end,
          measureKind: input.measureKind,
          measureSource: "manual",
          measureTarget: input.measureTarget,
        })
        .returning();
      if (!row) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to add bet." });
      }

      await syncTargetRow(row.id, "insert", row);
      return row;
    }),
});

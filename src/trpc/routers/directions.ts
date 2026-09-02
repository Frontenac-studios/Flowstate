import { and, asc, eq, gte, isNull, isNotNull, lt } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { syncDirectionRow } from "@/db/record-sync-mutation";
import { directions, leads } from "@/db/tables";

import { quarterOf } from "@/lib/quarter/quarter-period";

import { createTRPCRouter, protectedProcedure } from "../init";

/** A Direction is applied, never measured; at most this many run at once (§2). */
const MAX_ACTIVE_DIRECTIONS = 2;

async function getOwnedDirection(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(directions)
    .where(and(eq(directions.id, id), eq(directions.userId, userId)))
    .limit(1);
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Direction not found." });
  }
  return row;
}

export const directionsRouter = createTRPCRouter({
  /**
   * Active directions, oldest first (the first you set reads first), each carrying
   * its **applied line** for the current quarter (W10g).
   *
   * "Applied, never measured": the counts are of the Filter's USE of the Direction —
   * how many leads it scored against this rule, and how many it let you decline on
   * that basis — never a measure of the Direction itself. Raw counts, no rate
   * (discovery-quarter.md §11 Q7: a rate implies a target, and a Direction has none).
   *
   * `declined` counts leads YOU dismissed at triage, not deals the other side
   * declined — the fast no is the thing this Direction is doing for you.
   *
   * Derived at read, never stored: the count is a fact about the leads table, and a
   * copy on the direction row could only ever disagree with it.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const quarter = quarterOf(new Date());

    const [rows, leadRows] = await Promise.all([
      db
        .select()
        .from(directions)
        .where(and(eq(directions.userId, ctx.userId), isNull(directions.retiredAt)))
        .orderBy(asc(directions.createdAt)),
      db
        .select({ directionId: leads.directionId, state: leads.state, score: leads.score })
        .from(leads)
        .where(
          and(
            eq(leads.userId, ctx.userId),
            isNotNull(leads.directionId),
            gte(leads.createdAt, quarter.start),
            lt(leads.createdAt, quarter.end)
          )
        ),
    ]);

    const applied = new Map<string, { scored: number; declined: number }>();
    for (const lead of leadRows) {
      if (!lead.directionId) continue;
      const entry = applied.get(lead.directionId) ?? { scored: 0, declined: 0 };
      if (lead.score !== null) entry.scored += 1;
      if (lead.state === "dismissed") entry.declined += 1;
      applied.set(lead.directionId, entry);
    }

    return rows.map((row) => ({
      ...row,
      applied: applied.get(row.id) ?? { scored: 0, declined: 0 },
    }));
  }),

  create: protectedProcedure
    .input(z.object({ statement: z.string().trim().min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      // Cap is enforced here, not in the UI: a third active direction fails and
      // names that one must be retired first (§2). The UI turns this into a quiet
      // "retire one" affordance rather than surfacing the raw error.
      const active = await db
        .select({ id: directions.id })
        .from(directions)
        .where(and(eq(directions.userId, ctx.userId), isNull(directions.retiredAt)));
      if (active.length >= MAX_ACTIVE_DIRECTIONS) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `You already have ${MAX_ACTIVE_DIRECTIONS} directions. Retire one before adding another.`,
        });
      }

      const [row] = await db
        .insert(directions)
        .values({ userId: ctx.userId, orgId: ctx.orgId, statement: input.statement })
        .returning();
      if (!row) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to add direction." });
      }

      await syncDirectionRow(row.id, "insert", row);
      return row;
    }),

  /** Edit the statement in place. */
  update: protectedProcedure
    .input(z.object({ id: z.string().uuid(), statement: z.string().trim().min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedDirection(ctx.userId, input.id);

      const [row] = await db
        .update(directions)
        .set({ statement: input.statement, updatedAt: new Date() })
        .where(and(eq(directions.id, input.id), eq(directions.userId, ctx.userId)))
        .returning();
      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update direction.",
        });
      }

      await syncDirectionRow(row.id, "update", row);
      return row;
    }),

  /** Retire (never delete): the statement leaves the surface but stays in the record. */
  retire: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedDirection(ctx.userId, input.id);

      const now = new Date();
      const [row] = await db
        .update(directions)
        .set({ active: false, retiredAt: now, updatedAt: now })
        .where(and(eq(directions.id, input.id), eq(directions.userId, ctx.userId)))
        .returning();
      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retire direction.",
        });
      }

      await syncDirectionRow(row.id, "update", row);
      return { id: row.id };
    }),
});

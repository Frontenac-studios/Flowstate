import { and, asc, eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { syncDirectionRow } from "@/db/record-sync-mutation";
import { directions } from "@/db/tables";

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
  /** Active directions, oldest first (the first you set reads first). */
  list: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(directions)
      .where(and(eq(directions.userId, ctx.userId), isNull(directions.retiredAt)))
      .orderBy(asc(directions.createdAt));
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

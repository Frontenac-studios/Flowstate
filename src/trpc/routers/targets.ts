import { and, asc, eq, gte, inArray, isNotNull, lt, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { syncTargetRow } from "@/db/record-sync-mutation";
import { clients, directions, invoices, phases, projects, targets } from "@/db/tables";
import { deriveTargetCurrent, type MeasureSources } from "@/lib/quarter/derive-measure";
import { quarterOf } from "@/lib/quarter/quarter-period";

import { createTRPCRouter, protectedProcedure } from "../init";

/** Three bets a quarter — a landed (met) bet still counts, so winning early does
 * not free a slot (§13 Q4). The cap is enforced here; the UI makes it a moment. */
const MAX_TARGETS_PER_QUARTER = 3;

/** States that occupy a slot in the quarter's cap. */
const CAP_STATES = ["active", "met"] as const;

const measureKind = z.enum(["currency", "count", "shipped"]);
const derivationKey = z.enum(["money_booked", "clients_signed", "milestones_shipped"]);

async function getOwnedTarget(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(targets)
    .where(and(eq(targets.id, id), eq(targets.userId, userId)))
    .limit(1);
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Bet not found." });
  }
  return row;
}

/** Count the bets occupying a slot in the given quarter. */
async function countOccupying(userId: string, start: Date, end: Date): Promise<number> {
  const rows = await db
    .select({ id: targets.id })
    .from(targets)
    .where(
      and(
        eq(targets.userId, userId),
        gte(targets.periodStart, start),
        lt(targets.periodStart, end),
        inArray(targets.state, [...CAP_STATES])
      )
    );
  return rows.length;
}

export const targetsRouter = createTRPCRouter({
  /**
   * The bets for the current quarter (active + met), each with its Direction, the
   * projects serving it, and a resolved `current` — derived live for `auto` bets
   * (never persisted onto the row), or the last-entered value for `manual` ones.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const q = quarterOf(new Date());

    const [rows, invoiceRows, clientRows, phaseRows, servingRows] = await Promise.all([
      db
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
          archivedAt: targets.archivedAt,
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
        .orderBy(asc(targets.createdAt)),
      db
        .select({ amountCents: invoices.amountCents, bookedAt: invoices.createdAt })
        .from(invoices)
        .where(and(eq(invoices.userId, ctx.userId), ne(invoices.status, "void"))),
      db.select({ signedAt: clients.createdAt }).from(clients).where(eq(clients.userId, ctx.userId)),
      db
        .select({ targetId: projects.targetId, completedAt: phases.completedAt })
        .from(phases)
        .innerJoin(projects, eq(phases.projectId, projects.id))
        .where(
          and(
            eq(phases.userId, ctx.userId),
            isNotNull(phases.completedAt),
            isNotNull(projects.targetId)
          )
        ),
      db
        .select({ targetId: projects.targetId })
        .from(projects)
        .where(and(eq(projects.userId, ctx.userId), isNotNull(projects.targetId))),
    ]);

    const sources: MeasureSources = {
      invoices: invoiceRows,
      clients: clientRows,
      shippedPhases: phaseRows.flatMap((p) =>
        p.targetId && p.completedAt ? [{ targetId: p.targetId, completedAt: p.completedAt }] : []
      ),
    };

    const servingByTarget = new Map<string, number>();
    for (const s of servingRows) {
      if (s.targetId) servingByTarget.set(s.targetId, (servingByTarget.get(s.targetId) ?? 0) + 1);
    }

    return rows.map((t) => {
      const current =
        t.measureSource === "auto" && t.derivationKey != null
          ? deriveTargetCurrent(
              {
                id: t.id,
                derivationKey: t.derivationKey,
                periodStart: t.periodStart,
                periodEnd: t.periodEnd,
              },
              sources
            )
          : (t.measureCurrent ?? 0);
      return {
        ...t,
        current,
        projectsServing: servingByTarget.get(t.id) ?? 0,
        isMet: current >= t.measureTarget,
      };
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        directionId: z.string().uuid(),
        title: z.string().trim().min(1).max(200),
        measureKind,
        measureTarget: z.number().int().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [direction] = await db
        .select({ id: directions.id })
        .from(directions)
        .where(and(eq(directions.id, input.directionId), eq(directions.userId, ctx.userId)))
        .limit(1);
      if (!direction) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Direction not found." });
      }

      const q = quarterOf(new Date());
      if ((await countOccupying(ctx.userId, q.start, q.end)) >= MAX_TARGETS_PER_QUARTER) {
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

  /** Edit a bet's title, target, or how it's measured (kind + auto/manual source). */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().trim().min(1).max(200).optional(),
        measureKind: measureKind.optional(),
        measureTarget: z.number().int().min(0).optional(),
        measureSource: z.enum(["auto", "manual"]).optional(),
        derivationKey: derivationKey.nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await getOwnedTarget(ctx.userId, input.id);

      const patch: Partial<typeof targets.$inferInsert> = { updatedAt: new Date() };
      if (input.title !== undefined) patch.title = input.title;
      if (input.measureKind !== undefined) patch.measureKind = input.measureKind;
      if (input.measureTarget !== undefined) patch.measureTarget = input.measureTarget;
      if (input.measureSource !== undefined) patch.measureSource = input.measureSource;
      if (input.derivationKey !== undefined) patch.derivationKey = input.derivationKey;
      // An auto bet never carries a stored current (money never lands on the row);
      // switching to auto clears any manual value.
      if (input.measureSource === "auto") patch.measureCurrent = null;

      const [row] = await db
        .update(targets)
        .set(patch)
        .where(and(eq(targets.id, input.id), eq(targets.userId, ctx.userId)))
        .returning();
      if (!row) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update bet." });
      }

      await syncTargetRow(row.id, "update", row);
      return row;
    }),

  /** Set a manual bet's current value. Rejected for auto bets (derived at read). */
  setCurrent: protectedProcedure
    .input(z.object({ id: z.string().uuid(), current: z.number().int().min(0) }))
    .mutation(async ({ ctx, input }) => {
      const target = await getOwnedTarget(ctx.userId, input.id);
      if (target.measureSource === "auto") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This bet is measured automatically — its progress can't be set by hand.",
        });
      }

      const [row] = await db
        .update(targets)
        .set({ measureCurrent: input.current, updatedAt: new Date() })
        .where(and(eq(targets.id, input.id), eq(targets.userId, ctx.userId)))
        .returning();
      if (!row) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update bet." });
      }

      await syncTargetRow(row.id, "update", row);
      return row;
    }),

  /**
   * Archive a met bet off the active board (§13 Q4) — celebrate + archive-on-met.
   * State becomes `met`, which still occupies a slot in the quarter's cap. The
   * client calls this when a bet objectively crosses its number.
   */
  markMet: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedTarget(ctx.userId, input.id);
      const now = new Date();
      const [row] = await db
        .update(targets)
        .set({ state: "met", archivedAt: now, updatedAt: now })
        .where(and(eq(targets.id, input.id), eq(targets.userId, ctx.userId), eq(targets.state, "active")))
        .returning();
      // Already archived by a concurrent read — not an error.
      if (row) await syncTargetRow(row.id, "update", row);
      return { id: input.id };
    }),

  /** Retire (drop) a bet — it leaves the board but stays in the quarter's record. */
  retire: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedTarget(ctx.userId, input.id);
      const now = new Date();
      const [row] = await db
        .update(targets)
        .set({ state: "dropped", archivedAt: now, updatedAt: now })
        .where(and(eq(targets.id, input.id), eq(targets.userId, ctx.userId)))
        .returning();
      if (!row) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to retire bet." });
      }

      await syncTargetRow(row.id, "update", row);
      return { id: row.id };
    }),
});

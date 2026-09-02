import { and, asc, eq, gte, inArray, lt, min } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { appSettings, clients, ledgerPeriods, projects, timeEntries } from "@/db/tables";
import { computeBudgetBar } from "@/lib/budget/compute-budget-bar";
import { computeLedger, type Ledger, type LedgerGroup } from "@/lib/ledger/compute-ledger";
import {
  isPeriodClosed,
  lastClosedPeriod,
  periodContaining,
  periodForKey,
  shiftPeriod,
  type LedgerPeriod,
} from "@/lib/ledger/fortnight";
import { quarterLabel, quarterOf } from "@/lib/quarter/quarter-period";

import { createTRPCRouter, protectedProcedure } from "../init";

/**
 * W8 — the Ledger. The fortnightly retrospective of the Budget (W6): what you said
 * your quarter tilt was, against what the last closed fortnight actually shows, and
 * where the time went by client and project.
 *
 * A closed fortnight is served from its sealed snapshot when one exists, so a
 * historical ledger reads against the tilt as it was actually declared at the time
 * rather than today's. The in-progress fortnight is always computed live and never
 * sealed. `seal` is idempotent and runs when Money is opened — there is no cron,
 * because law 3 forbids anything here reaching the user on a surface they did not
 * open.
 *
 * Tenancy: `time_entries` and `ledger_periods` are financial-class and the tilt
 * lives on the personal `app_settings` row. Every read and write is owner-scoped by
 * `ctx.userId`; nothing computed is written back onto a shared row.
 *
 * Entries are joined DIRECTLY to projects, never through tasks — a client call
 * logged against a project with no task counts exactly as a tasked entry does. The
 * task-joined roll-up (`timeEntries.weeklyRollup`) silently drops those, which is
 * precisely the disagreement the Budget exists to avoid.
 */

const tzOffsetSchema = z.number().int().min(-840).max(840);
const periodKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** How far back the stepper may walk before we stop looking for entries. */
const MAX_HISTORY_PERIODS = 260; // ten years of fortnights

type LedgerSource = "sealed" | "live";

/** Owner-scoped read of the declared tilt. */
async function readTilt(userId: string): Promise<number | null> {
  const [settings] = await db
    .select({ quarterTiltBusinessPct: appSettings.quarterTiltBusinessPct })
    .from(appSettings)
    .where(eq(appSettings.userId, userId))
    .limit(1);
  return settings?.quarterTiltBusinessPct ?? null;
}

/** Compute a fortnight from the time log. `now` bounds a still-running entry. */
async function computePeriod(
  userId: string,
  period: LedgerPeriod,
  tiltBusinessPct: number | null,
  now: Date
): Promise<Ledger> {
  const rows = await db
    .select({
      projectId: timeEntries.projectId,
      taskId: timeEntries.taskId,
      billable: timeEntries.billable,
      startedAt: timeEntries.startedAt,
      endedAt: timeEntries.endedAt,
      projectName: projects.name,
      category: projects.category,
      clientId: projects.clientId,
    })
    .from(timeEntries)
    .innerJoin(projects, eq(timeEntries.projectId, projects.id))
    .where(
      and(
        eq(timeEntries.userId, userId),
        gte(timeEntries.startedAt, period.start),
        lt(timeEntries.startedAt, period.end)
      )
    );

  const clientIds = Array.from(
    new Set(rows.map((r) => r.clientId).filter((id): id is string => !!id))
  );
  const clientRows = clientIds.length
    ? await db
        .select({ id: clients.id, name: clients.name })
        .from(clients)
        .where(and(eq(clients.userId, userId), inArray(clients.id, clientIds)))
    : [];

  const projectById = new Map(
    rows.map((r) => [
      r.projectId,
      { id: r.projectId, name: r.projectName, clientId: r.clientId, category: r.category },
    ])
  );

  return computeLedger({
    entries: rows.map((r) => ({
      projectId: r.projectId,
      taskId: r.taskId,
      billable: r.billable,
      // A still-running entry counts up to now, as the Budget does.
      seconds: Math.max(
        0,
        Math.floor(((r.endedAt ?? now).getTime() - r.startedAt.getTime()) / 1000)
      ),
    })),
    projects: Array.from(projectById.values()),
    clients: clientRows,
    tiltBusinessPct,
  });
}

/** Rebuild a Ledger from a sealed row — no recomputation, no re-reading the tilt. */
function ledgerFromSeal(row: {
  tiltBusinessPct: number | null;
  businessSeconds: number;
  personalSeconds: number;
  breakdown: LedgerGroup[];
}): Ledger {
  return {
    bar: computeBudgetBar({
      businessSeconds: row.businessSeconds,
      personalSeconds: row.personalSeconds,
      tiltBusinessPct: row.tiltBusinessPct,
    }),
    totalSeconds: row.businessSeconds + row.personalSeconds,
    groups: row.breakdown,
  };
}

function describePeriod(period: LedgerPeriod, now: Date) {
  const periodQuarter = quarterOf(period.start);
  const currentQuarter = quarterOf(now);
  return {
    key: period.key,
    startDate: period.startDate,
    endDate: period.endDate,
    closesOn: period.closesOn,
    index: period.index,
    isClosed: isPeriodClosed(period, now),
    /**
     * The tilt is a quarter-long declaration. A fortnight from an earlier quarter
     * that was never sealed can only be read against the current declaration, which
     * was not in force then — the view says so rather than implying otherwise.
     */
    isCurrentQuarter:
      periodQuarter.year === currentQuarter.year &&
      periodQuarter.quarter === currentQuarter.quarter,
    quarterLabel: quarterLabel(periodQuarter),
  };
}

export const ledgerRouter = createTRPCRouter({
  /**
   * One fortnight. Defaults to the last closed one — the fortnight the ritual is
   * about — so the screen arrives populated and is never a blank page (§8b).
   */
  forPeriod: protectedProcedure
    .input(
      z.object({
        /** Omit for the most recently closed fortnight. */
        periodKey: periodKeySchema.optional(),
        tzOffsetMinutes: tzOffsetSchema,
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const period = input.periodKey
        ? periodForKey(input.periodKey, input.tzOffsetMinutes)
        : lastClosedPeriod(now, input.tzOffsetMinutes);

      if (!period) {
        // An unaligned key is a bad request, not an empty fortnight — say so rather
        // than silently rendering someone else's period.
        return { period: null, ledger: null, source: null as LedgerSource | null };
      }

      const [sealed] = await db
        .select({
          tiltBusinessPct: ledgerPeriods.tiltBusinessPct,
          businessSeconds: ledgerPeriods.businessSeconds,
          personalSeconds: ledgerPeriods.personalSeconds,
          breakdown: ledgerPeriods.breakdown,
          sealedAt: ledgerPeriods.sealedAt,
        })
        .from(ledgerPeriods)
        .where(
          and(eq(ledgerPeriods.userId, ctx.userId), eq(ledgerPeriods.periodStart, period.startDate))
        )
        .limit(1);

      if (sealed) {
        return {
          period: describePeriod(period, now),
          ledger: ledgerFromSeal(sealed),
          source: "sealed" as LedgerSource,
          sealedAt: sealed.sealedAt,
        };
      }

      const ledger = await computePeriod(ctx.userId, period, await readTilt(ctx.userId), now);
      return {
        period: describePeriod(period, now),
        ledger,
        source: "live" as LedgerSource,
        sealedAt: null,
      };
    }),

  /**
   * The range the stepper may walk: the newest closed fortnight, and the one holding
   * the first entry ever logged. Bounding below by real data stops the arrows paging
   * back into empty prehistory.
   */
  bounds: protectedProcedure
    .input(z.object({ tzOffsetMinutes: tzOffsetSchema }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const latest = lastClosedPeriod(now, input.tzOffsetMinutes);

      const [first] = await db
        .select({ earliest: min(timeEntries.startedAt) })
        .from(timeEntries)
        .where(eq(timeEntries.userId, ctx.userId));

      const earliestInstant = first?.earliest ? new Date(first.earliest) : null;
      const earliest = earliestInstant
        ? periodContaining(earliestInstant, input.tzOffsetMinutes)
        : null;

      return {
        latestClosedKey: latest.key,
        // Never offer a period newer than the newest closed one.
        earliestKey: earliest && earliest.index <= latest.index ? earliest.key : latest.key,
        hasEntries: earliestInstant !== null,
      };
    }),

  /**
   * Freeze every closed fortnight that has not been sealed yet. Idempotent, and
   * called when Money is opened: with no cron available (and none permitted), the
   * act of opening the surface is the only trigger law 3 allows.
   *
   * A fortnight with no logged time is sealed too — "nothing was logged" is itself
   * the honest read, and sealing it stops the walk-back re-examining it forever.
   */
  seal: protectedProcedure
    .input(z.object({ tzOffsetMinutes: tzOffsetSchema }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const latest = lastClosedPeriod(now, input.tzOffsetMinutes);

      const [first] = await db
        .select({ earliest: min(timeEntries.startedAt) })
        .from(timeEntries)
        .where(eq(timeEntries.userId, ctx.userId));
      if (!first?.earliest) return { sealed: [] as string[] };

      const earliest = periodContaining(new Date(first.earliest), input.tzOffsetMinutes);
      if (earliest.index > latest.index) return { sealed: [] as string[] };

      const existing = await db
        .select({ periodStart: ledgerPeriods.periodStart })
        .from(ledgerPeriods)
        .where(eq(ledgerPeriods.userId, ctx.userId))
        .orderBy(asc(ledgerPeriods.periodStart));
      const sealedKeys = new Set(existing.map((r) => r.periodStart));

      const tiltBusinessPct = await readTilt(ctx.userId);
      const floor = Math.max(earliest.index, latest.index - MAX_HISTORY_PERIODS);
      const sealed: string[] = [];

      for (let index = floor; index <= latest.index; index += 1) {
        const period = shiftPeriod(latest, index - latest.index, input.tzOffsetMinutes);
        if (sealedKeys.has(period.startDate)) continue;

        const ledger = await computePeriod(ctx.userId, period, tiltBusinessPct, now);
        await db
          .insert(ledgerPeriods)
          .values({
            userId: ctx.userId,
            periodStart: period.startDate,
            tiltBusinessPct,
            businessSeconds: ledger.bar.businessSeconds,
            personalSeconds: ledger.bar.personalSeconds,
            breakdown: ledger.groups,
          })
          .onConflictDoNothing();
        sealed.push(period.startDate);
      }

      return { sealed };
    }),
});

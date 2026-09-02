import "server-only";

import { and, asc, desc, eq, gte, inArray, isNull, ne } from "drizzle-orm";

import { db } from "@/db";
import { syncLeadRow, syncSourcingRunCostRow, syncSourcingRunRow } from "@/db/record-sync-mutation";
import {
  clients,
  directions,
  leads,
  rates,
  sourcingRunCosts,
  sourcingRuns,
  sourcingSettings,
} from "@/db/tables";
import { DEFAULT_WEIGHTS } from "@/lib/sourcing/constants";
import { dedupeDiscovered, renderFactsForScoring, WEB_MAX_RESULTS } from "@/lib/sourcing/research";
import {
  addSpend,
  checkBudget,
  clampBatchSize,
  decideRun,
  monthlyCeilingCents,
  remainingCapacity,
  spendToCents,
  usdToSpend,
  type Spend,
} from "@/lib/sourcing/run";
import { researchCompany } from "@/server/sourcing/research-company";
import { scoreCompany } from "@/server/sourcing/score-company";
import { getWebResearchAdapter } from "@/server/sourcing/web-research";

/**
 * W10i — the weekly sourcing agent, as a resumable worker.
 *
 * Why resumable rather than one long job: researching a single company takes 50–75
 * seconds and the function is killed at 300, so a batch of five simply cannot finish
 * in one invocation. Each tick does what it can inside a time budget, writes its
 * progress to the run row, and returns; the next tick picks the run up where it
 * stopped. Nothing is left in memory between ticks, so a killed invocation costs at
 * most the company it was mid-way through.
 *
 * Money discipline, in order:
 *  1. The run is opt-in — a user who hasn't enabled it is never touched.
 *  2. Every tick re-checks the 30-day ceiling against REAL billed charges before it
 *     spends anything, so a stuck loop stops itself rather than billing all month.
 *  3. Every charge is recorded as it happens, not at the end — a run that dies
 *     half-way still leaves an honest record of what it spent.
 */

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export type TickResult = {
  userId: string;
  action: "started" | "resumed" | "idle" | "blocked";
  reason?: string;
  runId?: string;
  discovered?: number;
  processed?: number;
  finished?: boolean;
  spentCents?: number;
  errors: string[];
};

/** What the last 30 days actually cost this user, in cents. */
async function spentLast30DaysCents(userId: string, now: Date): Promise<number> {
  const rows = await db
    .select({
      amountCents: sourcingRunCosts.amountCents,
      amountMicros: sourcingRunCosts.amountMicros,
    })
    .from(sourcingRunCosts)
    .where(
      and(
        eq(sourcingRunCosts.userId, userId),
        gte(sourcingRunCosts.createdAt, new Date(now.getTime() - THIRTY_DAYS_MS))
      )
    );

  return rows.reduce(
    (total, row) => total + spendToCents({ cents: row.amountCents, micros: row.amountMicros }),
    0
  );
}

/** Record a charge immediately — never batched to the end of a run. */
async function recordSpend(
  ctx: { userId: string; orgId: string },
  runId: string,
  spend: Spend,
  calls: number
): Promise<void> {
  if (spend.cents === 0 && spend.micros === 0) return;
  const [row] = await db
    .insert(sourcingRunCosts)
    .values({
      userId: ctx.userId,
      orgId: ctx.orgId,
      runId,
      amountCents: spend.cents,
      amountMicros: spend.micros,
      calls,
    })
    .returning();
  if (row) await syncSourcingRunCostRow(row.id, "insert", row);
}

/** Every company name this user should never be shown again. */
async function knownNames(userId: string): Promise<string[]> {
  const [leadRows, clientRows] = await Promise.all([
    db.select({ name: leads.companyName }).from(leads).where(eq(leads.userId, userId)),
    db.select({ name: clients.name }).from(clients).where(eq(clients.userId, userId)),
  ]);
  return [...leadRows, ...clientRows].map((r) => r.name);
}

/**
 * Advance one user's sourcing by one invocation's worth of work. Returns what it did
 * so the route can report it honestly rather than claiming a run "succeeded".
 */
export async function tickUser(params: {
  userId: string;
  orgId: string;
  now: Date;
  startedAt: number;
  elapsed: () => number;
}): Promise<TickResult> {
  const { userId, orgId, now } = params;
  const errors: string[] = [];

  const [settings] = await db
    .select()
    .from(sourcingSettings)
    .where(eq(sourcingSettings.userId, userId))
    .limit(1);

  const enabled = settings?.weeklyRunEnabled === true;
  const batchSize = clampBatchSize(settings?.weeklyRunBatchSize);

  const [unfinished] = await db
    .select()
    .from(sourcingRuns)
    .where(
      and(
        eq(sourcingRuns.userId, userId),
        inArray(sourcingRuns.status, ["discovering", "researching"])
      )
    )
    .orderBy(desc(sourcingRuns.createdAt))
    .limit(1);

  const recentRuns = await db
    .select({ weekKey: sourcingRuns.weekKey })
    .from(sourcingRuns)
    .where(and(eq(sourcingRuns.userId, userId), ne(sourcingRuns.trigger, "manual")))
    .orderBy(desc(sourcingRuns.createdAt))
    .limit(10);

  const decision = decideRun({
    now,
    enabled,
    hasUnfinishedRun: unfinished != null,
    weekKeysAlreadyRun: recentRuns.map((r) => r.weekKey),
  });

  if (decision.action === "idle") {
    return { userId, action: "idle", reason: decision.reason, errors };
  }

  // The rail, checked before anything is spent — on a resume as well as a start.
  const ceilingCents = monthlyCeilingCents(process.env);
  const spent = await spentLast30DaysCents(userId, now);
  const budget = checkBudget({ spentLast30DaysCents: spent, ceilingCents });
  if (!budget.allowed) {
    if (unfinished) {
      await failRun(unfinished.id, userId, `30-day spend ceiling reached (${spent.toFixed(1)}¢).`);
    }
    return {
      userId,
      action: "blocked",
      reason: "ceiling",
      spentCents: spent,
      errors: [`30-day spend ceiling reached: ${spent.toFixed(1)}¢ of ${ceilingCents}¢.`],
    };
  }

  const adapter = getWebResearchAdapter();
  if (!adapter) {
    return { userId, action: "idle", reason: "no-web-adapter", errors };
  }

  let run = unfinished ?? null;
  let discovered = 0;

  if (decision.action === "start") {
    const [created] = await db
      .insert(sourcingRuns)
      .values({
        userId,
        orgId,
        trigger: "cron",
        status: "discovering",
        weekKey: decision.weekKey,
        batchSize,
      })
      .returning();
    if (!created) return { userId, action: "idle", reason: "insert-failed", errors };
    await syncSourcingRunRow(created.id, "insert", created);
    run = created;
  }

  if (!run) return { userId, action: "idle", reason: "no-run", errors };

  // --- Discovery: only ever once per run, on the way in.
  if (run.status === "discovering") {
    try {
      const result = await adapter.discover({
        segments: settings?.segments ?? [],
        exclusions: settings?.exclusions ?? [],
        knownNames: await knownNames(userId),
        count: run.batchSize,
        maxResults: WEB_MAX_RESULTS,
      });
      await recordSpend({ userId, orgId }, run.id, usdToSpend(result.costUsd), 1);

      const fresh = dedupeDiscovered(result.companies, await knownNames(userId), run.batchSize);
      for (const company of fresh) {
        const [row] = await db
          .insert(leads)
          .values({
            userId,
            orgId,
            companyName: company.name,
            notes: company.note || null,
            source: "sourced",
            runId: run.id,
            directionId: await activeDirectionId(userId),
          })
          .returning();
        if (row) await syncLeadRow(row.id, "insert", row);
      }
      discovered = fresh.length;

      const [updated] = await db
        .update(sourcingRuns)
        .set({
          status: "researching",
          discovered,
          updatedAt: new Date(),
          ...(discovered === 0 ? { status: "complete" as const, finishedAt: new Date() } : {}),
        })
        .where(eq(sourcingRuns.id, run.id))
        .returning();
      if (updated) {
        await syncSourcingRunRow(updated.id, "update", updated);
        run = updated;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Discovery failed.";
      await failRun(run.id, userId, message);
      return { userId, action: "started", runId: run.id, errors: [message] };
    }
  }

  // --- Research + score, as many as the clock allows.
  let processed = run.processed;
  let runSpend: Spend = { cents: 0, micros: 0 };

  const queue = await db
    .select()
    .from(leads)
    .where(and(eq(leads.userId, userId), eq(leads.runId, run.id), isNull(leads.researchedAt)))
    .orderBy(asc(leads.createdAt));

  const capacity = remainingCapacity({ elapsedMs: params.elapsed() });
  const slice = queue.slice(0, capacity);

  for (const lead of slice) {
    try {
      const { facts, provider, costUsd } = await researchCompany({
        companyName: lead.companyName,
        companyNotes: lead.notes ?? "",
        segments: settings?.segments ?? [],
      });
      runSpend = addSpend(runSpend, usdToSpend(costUsd));
      await recordSpend({ userId, orgId }, run.id, usdToSpend(costUsd), 2);

      const scored = await scoreOne(userId, lead.id, {
        companyName: lead.companyName,
        companyNotes: lead.notes ?? "",
        researchedFacts: renderFactsForScoring(facts),
        segments: settings?.segments ?? [],
        exclusions: settings?.exclusions ?? [],
      });

      const [row] = await db
        .update(leads)
        .set({
          research: facts,
          researchedAt: new Date(),
          researchProvider: provider,
          score: scored?.score ?? null,
          confidence: scored?.confidence ?? null,
          rationale: scored?.rationale ?? null,
          updatedAt: new Date(),
        })
        .where(and(eq(leads.id, lead.id), eq(leads.userId, userId)))
        .returning();
      if (row) await syncLeadRow(row.id, "update", row);

      processed += 1;
    } catch (e) {
      // One bad company must not sink the batch: mark it researched-with-nothing so
      // the queue advances, and carry the error out for the response.
      errors.push(`${lead.companyName}: ${e instanceof Error ? e.message : "failed"}`);
      const [row] = await db
        .update(leads)
        .set({ researchedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(leads.id, lead.id), eq(leads.userId, userId)))
        .returning();
      if (row) await syncLeadRow(row.id, "update", row);
      processed += 1;
    }
  }

  const finished = processed >= run.discovered;
  const [final] = await db
    .update(sourcingRuns)
    .set({
      processed,
      updatedAt: new Date(),
      ...(finished ? { status: "complete" as const, finishedAt: new Date() } : {}),
    })
    .where(eq(sourcingRuns.id, run.id))
    .returning();
  if (final) await syncSourcingRunRow(final.id, "update", final);

  return {
    userId,
    action: decision.action === "start" ? "started" : "resumed",
    runId: run.id,
    discovered: run.discovered,
    processed,
    finished,
    spentCents: spendToCents(runSpend),
    errors,
  };
}

async function activeDirectionId(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: directions.id })
    .from(directions)
    .where(and(eq(directions.userId, userId), isNull(directions.retiredAt)))
    .limit(1);
  return row?.id ?? null;
}

async function scoreOne(
  userId: string,
  leadId: string,
  inputs: {
    companyName: string;
    companyNotes: string;
    researchedFacts: string;
    segments: { id: string; label: string; firmographics: string }[];
    exclusions: string[];
  }
) {
  void leadId;
  const [directionRows, clientRows, rateRows, settingsRow] = await Promise.all([
    db
      .select({ statement: directions.statement })
      .from(directions)
      .where(and(eq(directions.userId, userId), isNull(directions.retiredAt))),
    db.select({ name: clients.name }).from(clients).where(eq(clients.userId, userId)),
    db.select({ amountCents: rates.amountCents }).from(rates).where(eq(rates.userId, userId)),
    db
      .select({ weights: sourcingSettings.weights })
      .from(sourcingSettings)
      .where(eq(sourcingSettings.userId, userId))
      .limit(1)
      .then((r) => r[0]),
  ]);

  return scoreCompany({
    companyName: inputs.companyName,
    companyNotes: inputs.companyNotes,
    researchedFacts: inputs.researchedFacts,
    segments: inputs.segments,
    weights: settingsRow?.weights ?? DEFAULT_WEIGHTS,
    exclusions: inputs.exclusions,
    directions: directionRows.map((d) => d.statement),
    wonClientNames: clientRows.map((c) => c.name),
    rateFloorCents: rateRows.length ? Math.min(...rateRows.map((r) => r.amountCents)) : null,
  });
}

async function failRun(runId: string, userId: string, message: string): Promise<void> {
  const [row] = await db
    .update(sourcingRuns)
    .set({ status: "failed", error: message, finishedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(sourcingRuns.id, runId), eq(sourcingRuns.userId, userId)))
    .returning();
  if (row) await syncSourcingRunRow(row.id, "update", row);
}

/** Users who have switched the weekly run on, plus anyone with a run still in flight. */
export async function usersNeedingTick(): Promise<{ userId: string; orgId: string }[]> {
  const [enabled, inFlight] = await Promise.all([
    db
      .select({ userId: sourcingSettings.userId, orgId: sourcingSettings.orgId })
      .from(sourcingSettings)
      .where(eq(sourcingSettings.weeklyRunEnabled, true)),
    db
      .select({ userId: sourcingRuns.userId, orgId: sourcingRuns.orgId })
      .from(sourcingRuns)
      .where(inArray(sourcingRuns.status, ["discovering", "researching"])),
  ]);

  const seen = new Set<string>();
  const out: { userId: string; orgId: string }[] = [];
  for (const row of [...enabled, ...inFlight]) {
    if (seen.has(row.userId)) continue;
    seen.add(row.userId);
    out.push(row);
  }
  return out;
}

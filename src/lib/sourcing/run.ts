/**
 * W10i — the weekly sourcing run's arithmetic. Pure and clock-injected, because
 * almost every decision here is one you want to be able to check without a cron, a
 * network, or a model: when a run is due, whether the budget allows it, how far the
 * agent can get before the function is killed, and how a prospect nobody triaged
 * loses ground to a fresh one.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** The agent sources on a Tuesday morning — the week's first working decision. */
export const RUN_WEEKDAY = 2; // 0=Sun

/** Prospects per run. The plan's band is 3–10; five is a week's worth to triage. */
export const DEFAULT_BATCH_SIZE = 5;
export const MIN_BATCH_SIZE = 3;
export const MAX_BATCH_SIZE = 10;

/**
 * How long one invocation may keep working. Vercel kills the function at 300s, and a
 * single company costs 50–75s to research and score — so the worker stops starting
 * new work once the remaining budget can't cover the slowest company, and leaves the
 * rest for the next tick rather than dying mid-write.
 */
export const INVOCATION_BUDGET_MS = 240_000;
export const PER_COMPANY_BUDGET_MS = 90_000;

/**
 * The 30-day spend ceiling, in whole cents.
 *
 * **Measured, not guessed.** A batch of three cost $1.04 end-to-end — roughly 35c a
 * prospect, across seven model calls (two for discovery, two to research each company,
 * one to score it). A five-a-week cadence therefore runs about $1.75 a week, or
 * $7-8 a month. The ceiling is set at ~3x that: high enough that ordinary use never
 * meets it, low enough that a bug — a cron firing hourly, a run re-discovering
 * forever — is stopped within a day or so rather than billing all month.
 *
 * An earlier draft of this file said "roughly 25c a run" and set the ceiling at $10.
 * That came from timing ONE research call and forgetting that a run also pays for
 * discovery, the extraction step and the score. A safety rail calibrated against a
 * number nobody measured is not a safety rail.
 *
 * Deliberately a constant and not a user setting: a rail you can move from the UI is
 * one you will move at exactly the wrong moment. `SOURCING_MONTHLY_CEILING_CENTS`
 * overrides it for anyone who genuinely needs a different number.
 */
export const DEFAULT_MONTHLY_CEILING_CENTS = 2500;

/** Measured cost of one sourced prospect, for honest UI copy. */
export const APPROX_CENTS_PER_PROSPECT = 35;

export function monthlyCeilingCents(env: Record<string, string | undefined>): number {
  const raw = env.SOURCING_MONTHLY_CEILING_CENTS;
  if (!raw) return DEFAULT_MONTHLY_CEILING_CENTS;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_MONTHLY_CEILING_CENTS;
}

/**
 * ISO-8601 week key, e.g. "2026-W36". A run is unique per user per week, which is
 * what stops an hourly worker starting a fresh batch every hour of Tuesday.
 */
export function isoWeekKey(date: Date): string {
  // Shift to the Thursday of this week — ISO weeks are numbered by the year their
  // Thursday falls in, which is what makes turn-of-year weeks come out right.
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const year = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** Is this the day the agent sources? */
export function isRunDay(now: Date): boolean {
  return now.getDay() === RUN_WEEKDAY;
}

export function clampBatchSize(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return DEFAULT_BATCH_SIZE;
  return Math.min(MAX_BATCH_SIZE, Math.max(MIN_BATCH_SIZE, Math.round(value)));
}

/** Cost arithmetic in whole cents + millionths, so sub-cent calls neither vanish nor inflate. */
export type Spend = { cents: number; micros: number };

export const MICROS_PER_CENT = 1_000_000;

/** A model call's USD charge → the stored representation. */
export function usdToSpend(usd: number): Spend {
  if (!Number.isFinite(usd) || usd <= 0) return { cents: 0, micros: 0 };
  const totalMicros = Math.round(usd * 100 * MICROS_PER_CENT);
  return {
    cents: Math.floor(totalMicros / MICROS_PER_CENT),
    micros: totalMicros % MICROS_PER_CENT,
  };
}

export function addSpend(a: Spend, b: Spend): Spend {
  const totalMicros = a.cents * MICROS_PER_CENT + a.micros + (b.cents * MICROS_PER_CENT + b.micros);
  return {
    cents: Math.floor(totalMicros / MICROS_PER_CENT),
    micros: totalMicros % MICROS_PER_CENT,
  };
}

export function spendToCents(spend: Spend): number {
  return spend.cents + spend.micros / MICROS_PER_CENT;
}

export function formatSpend(spend: Spend): string {
  const cents = spendToCents(spend);
  return cents < 100 ? `${cents.toFixed(1)}¢` : `$${(cents / 100).toFixed(2)}`;
}

export type BudgetVerdict =
  | { allowed: true }
  | { allowed: false; reason: "ceiling"; spentCents: number; ceilingCents: number };

/** Would another run breach the 30-day ceiling? Checked before any money is spent. */
export function checkBudget(inputs: {
  spentLast30DaysCents: number;
  ceilingCents: number;
}): BudgetVerdict {
  if (inputs.spentLast30DaysCents >= inputs.ceilingCents) {
    return {
      allowed: false,
      reason: "ceiling",
      spentCents: inputs.spentLast30DaysCents,
      ceilingCents: inputs.ceilingCents,
    };
  }
  return { allowed: true };
}

/** Should a cron tick start a new run, resume one, or do nothing? */
export type RunDecision =
  | { action: "resume" }
  | { action: "start"; weekKey: string }
  | { action: "idle"; reason: "not-run-day" | "already-ran" | "disabled" };

export function decideRun(inputs: {
  now: Date;
  enabled: boolean;
  hasUnfinishedRun: boolean;
  weekKeysAlreadyRun: string[];
}): RunDecision {
  // An unfinished run is always finished first, even on a day that wouldn't start
  // one — otherwise a batch begun on Tuesday would stall until the next Tuesday.
  if (inputs.hasUnfinishedRun) return { action: "resume" };
  if (!inputs.enabled) return { action: "idle", reason: "disabled" };
  if (!isRunDay(inputs.now)) return { action: "idle", reason: "not-run-day" };

  const weekKey = isoWeekKey(inputs.now);
  if (inputs.weekKeysAlreadyRun.includes(weekKey)) {
    return { action: "idle", reason: "already-ran" };
  }
  return { action: "start", weekKey };
}

/** How many companies this invocation may still start, given the clock. */
export function remainingCapacity(inputs: {
  elapsedMs: number;
  budgetMs?: number;
  perCompanyMs?: number;
}): number {
  const budget = inputs.budgetMs ?? INVOCATION_BUDGET_MS;
  const per = inputs.perCompanyMs ?? PER_COMPANY_BUDGET_MS;
  return Math.max(0, Math.floor((budget - inputs.elapsedMs) / per));
}

/**
 * Rollover with decay. A sourced prospect nobody triaged is not worthless — it may
 * simply have arrived in a busy week — so it stays on the board and keeps its score.
 * What it loses is PRIORITY: after a fortnight it slips 10% a week against fresher
 * finds, to a floor of half.
 *
 * Decaying rather than expiring is the point. Deleting week-old prospects would throw
 * away research already paid for; leaving them at full weight would let a stale board
 * out-rank everything the agent found this morning.
 */
export const DECAY_GRACE_DAYS = 14;
export const DECAY_PER_WEEK = 0.1;
export const DECAY_FLOOR = 0.5;

export function rolloverDecay(ageDays: number): number {
  if (ageDays <= DECAY_GRACE_DAYS) return 1;
  const weeksOver = (ageDays - DECAY_GRACE_DAYS) / 7;
  return Math.max(DECAY_FLOOR, 1 - weeksOver * DECAY_PER_WEEK);
}

/** Whole days between two instants, floored at zero. */
export function ageInDays(createdAt: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / DAY_MS));
}

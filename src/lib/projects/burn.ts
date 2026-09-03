/**
 * W15 — estimate vs actual, and the off-track signal.
 *
 * The signal is deliberately ONE comparison (discovery 4.5): **budget consumed
 * against work completed**. Not "are we past the deadline", which W7 and
 * `detect-project-slip` already answer, and not "will we overrun", which needs a
 * forecast nobody can honestly make. If a project has burned 70% of its hours to
 * finish 40% of its phases, that is a fact about today, and it fires before either
 * the bill (hourly) or the margin (fixed-fee) surprises you.
 *
 * The same number means opposite things depending on how the work is sold, which is
 * why `billingType` exists: burning hot on **hourly** earns more revenue and costs
 * goodwill; burning hot on **fixed-fee** eats the margin directly. The maths is
 * shared, the framing is not.
 */

const SECONDS_PER_HOUR = 3600;

/**
 * How far ahead of the work the budget must run before it counts as off-track.
 * Fifteen points, because a plan is an estimate: a phase that is a little heavier
 * than guessed is normal, and a signal that fires on normal gets ignored.
 */
export const OFF_TRACK_MARGIN_PCT = 15;

/**
 * No signal at all until this much of the budget is gone. Early in a project the
 * ratio is meaningless — two hours against a forty-hour estimate is 5% consumed and
 * 0% complete, which is "ahead of the work" by the arithmetic and nothing at all in
 * reality.
 */
export const OFF_TRACK_MIN_CONSUMED_PCT = 25;

export type BurnState = "unplanned" | "ok" | "hot";

export type Burn = {
  /** Estimated hours, or null when this phase was never estimated. */
  estimateHours: number | null;
  actualHours: number;
  /** Actual ÷ estimate, as a percentage. Null without an estimate. */
  consumedPct: number | null;
  /** Work finished, as a percentage — from task completion, not from hours. */
  completedPct: number;
  /** consumedPct − completedPct: how far the budget is ahead of the work. */
  aheadByPct: number | null;
  state: BurnState;
};

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Burn for one unit of work — a phase, or a whole project.
 *
 * `state` is `unplanned` rather than `ok` when there is no estimate: a phase nobody
 * estimated is not on track, it is unmeasured, and showing it green would be a lie
 * the rest of the signal has to live with.
 */
export function computeBurn(input: {
  estimateHours: number | null;
  actualSeconds: number;
  completedPct: number;
}): Burn {
  const actualHours = round(input.actualSeconds / SECONDS_PER_HOUR);
  const completedPct = Math.max(0, Math.min(100, round(input.completedPct)));

  if (input.estimateHours == null || input.estimateHours <= 0) {
    return {
      estimateHours: input.estimateHours,
      actualHours,
      consumedPct: null,
      completedPct,
      aheadByPct: null,
      state: "unplanned",
    };
  }

  const consumedPct = round((actualHours / input.estimateHours) * 100);
  const aheadByPct = round(consumedPct - completedPct);

  const hot =
    consumedPct >= OFF_TRACK_MIN_CONSUMED_PCT &&
    aheadByPct > OFF_TRACK_MARGIN_PCT &&
    // Finished work is never "running hot". A project that came in at 120% of its
    // estimate but is DONE has nothing left to steer — that overrun is history, and
    // reporting it is exactly the lagging signal this measure replaced.
    completedPct < 100;

  return {
    estimateHours: input.estimateHours,
    actualHours,
    consumedPct,
    completedPct,
    aheadByPct,
    state: hot ? "hot" : "ok",
  };
}

export type PhaseBurnInput = {
  phaseId: string;
  phaseName: string;
  estimateHours: number | null;
  actualSeconds: number;
  completedPct: number;
};

export type PhaseBurn = PhaseBurnInput & { burn: Burn };

export type ProjectBurn = {
  phases: PhaseBurn[];
  /** The project rolled up: estimates summed, actuals summed, progress weighted. */
  total: Burn;
  /** How many phases carry an estimate — the project total means little below one. */
  estimatedPhaseCount: number;
  hotPhaseCount: number;
};

/**
 * Roll phases into a project read.
 *
 * The project's completed-percent is weighted BY ESTIMATE, not by phase count: a
 * forty-hour phase finishing is not the same event as a two-hour one finishing, and
 * averaging them flat would let a project look half-done because the small phases
 * went first. Unestimated phases contribute their actual hours but no estimate, so
 * they drag `consumedPct` up honestly rather than being silently excluded.
 */
export function computeProjectBurn(phases: ReadonlyArray<PhaseBurnInput>): ProjectBurn {
  const withBurn: PhaseBurn[] = phases.map((phase) => ({
    ...phase,
    burn: computeBurn({
      estimateHours: phase.estimateHours,
      actualSeconds: phase.actualSeconds,
      completedPct: phase.completedPct,
    }),
  }));

  const estimated = phases.filter((p) => p.estimateHours != null && p.estimateHours > 0);
  const totalEstimate = estimated.reduce((sum, p) => sum + (p.estimateHours ?? 0), 0);
  const totalActualSeconds = phases.reduce((sum, p) => sum + p.actualSeconds, 0);

  const weightedCompleted =
    totalEstimate > 0
      ? estimated.reduce((sum, p) => sum + (p.estimateHours ?? 0) * p.completedPct, 0) /
        totalEstimate
      : 0;

  return {
    phases: withBurn,
    total: computeBurn({
      estimateHours: totalEstimate > 0 ? totalEstimate : null,
      actualSeconds: totalActualSeconds,
      completedPct: weightedCompleted,
    }),
    estimatedPhaseCount: estimated.length,
    hotPhaseCount: withBurn.filter((p) => p.burn.state === "hot").length,
  };
}

/** The effective hourly rate a fixed fee has actually earned so far, in cents. */
export function effectiveRateCents(feeAmountCents: number, actualSeconds: number): number | null {
  if (actualSeconds <= 0) return null;
  return Math.round(feeAmountCents / (actualSeconds / SECONDS_PER_HOUR));
}

export type FixedFeeHealth = {
  effectiveRateCents: number | null;
  targetRateFloorCents: number | null;
  /** The fee is now earning less per hour than the floor you set to win it. */
  belowFloor: boolean;
  /** Hours still available before the fee drops through the floor. Null if unknowable. */
  hoursUntilFloor: number | null;
};

/**
 * What a fixed fee is actually earning, against the floor set when it was taken.
 *
 * `hoursUntilFloor` is the number worth showing: "you are at $95/hr against a $80
 * floor" is abstract, "eleven more hours and this stops being worth doing" is a
 * decision. It is the only forecast in this module, and it is a safe one — it
 * extrapolates nothing about the work, only divides a fee by a rate.
 */
export function fixedFeeHealth(input: {
  feeAmountCents: number | null;
  targetRateFloorCents: number | null;
  actualSeconds: number;
}): FixedFeeHealth {
  const rate =
    input.feeAmountCents == null
      ? null
      : effectiveRateCents(input.feeAmountCents, input.actualSeconds);

  const belowFloor =
    rate != null && input.targetRateFloorCents != null && rate < input.targetRateFloorCents;

  const hoursUntilFloor =
    input.feeAmountCents != null &&
    input.targetRateFloorCents != null &&
    input.targetRateFloorCents > 0
      ? round(
          Math.max(
            0,
            input.feeAmountCents / input.targetRateFloorCents -
              input.actualSeconds / SECONDS_PER_HOUR
          )
        )
      : null;

  return {
    effectiveRateCents: rate,
    targetRateFloorCents: input.targetRateFloorCents,
    belowFloor,
    hoursUntilFloor,
  };
}

/**
 * The sentence the surfaces show. Type-aware, because the same burn means opposite
 * things: hourly overrun bills more and spends goodwill; fixed-fee overrun is margin
 * you have already lost.
 */
export function describeBurn(
  burn: Burn,
  billingType: "hourly" | "fixed_fee",
  fee?: FixedFeeHealth
): string | null {
  if (burn.state !== "hot") return null;

  const ahead = `${burn.consumedPct}% of the budget spent on ${burn.completedPct}% of the work`;

  if (billingType === "fixed_fee") {
    if (fee?.belowFloor && fee.effectiveRateCents != null) {
      return `${ahead} — the fee is now earning $${Math.round(fee.effectiveRateCents / 100)}/hr, below your floor.`;
    }
    if (fee?.hoursUntilFloor != null) {
      return `${ahead} — about ${fee.hoursUntilFloor}h before the fee drops through your floor.`;
    }
    return `${ahead} — the margin is going, not the revenue.`;
  }

  return `${ahead} — billable, but it will land over.`;
}

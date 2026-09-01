/**
 * W14 — the Week steering deck, off-target banner. The weekly early-warning of the
 * biweekly Ledger (W8): a single reflective line shown ONLY when the week's logged
 * time (W6) drifts from the declared tilt past a threshold. Silent by default,
 * worded as a question, reserved-yellow — never a red alarm. This is the pure
 * decision; the banner supplies the copy and the colour.
 */

import type { BudgetBar } from "./compute-budget-bar";

/** Percentage points off the declared tilt, over a full week, that trips the banner. */
export const OFF_TARGET_THRESHOLD_PCT = 15;

export type OffTarget = {
  /** True when the week ran MORE personal than declared (actual business% below tilt). */
  towardPersonal: boolean;
  /** actual business% − tilt business% (negative = more personal). */
  deltaPct: number;
  actualBusinessPct: number;
  tiltBusinessPct: number;
};

/**
 * Returns the drift to reflect on, or null when there's nothing to say — no tilt
 * declared, nothing logged yet, or the week is within threshold of the tilt.
 */
export function evaluateOffTarget(
  bar: BudgetBar,
  thresholdPct: number = OFF_TARGET_THRESHOLD_PCT
): OffTarget | null {
  if (bar.state !== "measuring") return null;
  if (bar.deltaPct === null || bar.actualBusinessPct === null || bar.tiltBusinessPct === null) {
    return null;
  }
  if (Math.abs(bar.deltaPct) < thresholdPct) return null;

  return {
    towardPersonal: bar.deltaPct < 0,
    deltaPct: bar.deltaPct,
    actualBusinessPct: bar.actualBusinessPct,
    tiltBusinessPct: bar.tiltBusinessPct,
  };
}

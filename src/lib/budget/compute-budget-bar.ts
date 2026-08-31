/**
 * W6 — the Budget. The one honest reading of a day: how the time you actually
 * logged split between business and personal, held against the tilt you declared
 * for the quarter. Time is the score (Mission law 4), so the denominator is
 * *seconds logged*, never task counts — six ten-minute errands barely move the
 * split, one three-hour detour moves it visibly, because that is just arithmetic
 * on seconds.
 *
 * Pure and numeric on purpose: it states, it never nags (law 3). No thresholds,
 * no colour, no "you're behind" — the view decides how to show these numbers, and
 * the rule is that it may never block, warn modally, or turn red. `deltaPct` is the
 * single latent hook the Week deck's off-target flag (W14) will read; nothing here
 * acts on it.
 *
 * The capacity read (free vs booked) is a secondary context line sourced from the
 * read-only calendar — accepted, timed events only (declined events never reach the
 * store; all-day events are excluded before they get here). It is optional: the
 * split stands on its own when no calendar is connected.
 */

export type ComputeBudgetBarInput = {
  /** Seconds logged today to business-category projects. */
  businessSeconds: number;
  /** Seconds logged today to personal-category projects (includes Maintenance). */
  personalSeconds: number;
  /** Declared business share 0–100, or null when never declared. */
  tiltBusinessPct: number | null;
  /** Booked minutes today from accepted, timed calendar events. Omit if no calendar. */
  bookedMinutes?: number | null;
  /** Working-day capacity in minutes (day length). Omit if unknown. */
  capacityMinutes?: number | null;
};

export type BudgetBarState = "unset" | "empty" | "measuring";

export type BudgetBar = {
  businessSeconds: number;
  personalSeconds: number;
  /** business + personal — the whole of today's logged time. */
  loggedSeconds: number;
  /** Business share of logged time, whole percent; null when nothing is logged yet. */
  actualBusinessPct: number | null;
  /** Echo of the declared tilt, or null when unset. */
  tiltBusinessPct: number | null;
  /**
   * actual − tilt (business axis), whole percent; positive = more business than
   * declared, negative = more personal. Null when either side is unknown. The W14
   * off-target flag reads this; the Budget itself never reacts to it.
   */
  deltaPct: number | null;
  /** unset = no tilt declared; empty = tilt set but nothing logged; measuring = live. */
  state: BudgetBarState;
  /** Capacity − booked, floored at 0; null when either calendar figure is absent. */
  freeMinutes: number | null;
  /** Booked minutes today (accepted, timed); null when no calendar figure was given. */
  bookedMinutes: number | null;
};

export function computeBudgetBar(input: ComputeBudgetBarInput): BudgetBar {
  const businessSeconds = Math.max(0, input.businessSeconds);
  const personalSeconds = Math.max(0, input.personalSeconds);
  const loggedSeconds = businessSeconds + personalSeconds;

  const tiltBusinessPct = input.tiltBusinessPct;

  const actualBusinessPct =
    loggedSeconds > 0 ? Math.round((businessSeconds / loggedSeconds) * 100) : null;

  const deltaPct =
    actualBusinessPct !== null && tiltBusinessPct !== null
      ? actualBusinessPct - tiltBusinessPct
      : null;

  const state: BudgetBarState =
    tiltBusinessPct === null ? "unset" : loggedSeconds === 0 ? "empty" : "measuring";

  const bookedMinutes =
    input.bookedMinutes === undefined || input.bookedMinutes === null
      ? null
      : Math.max(0, input.bookedMinutes);
  const capacityMinutes =
    input.capacityMinutes === undefined || input.capacityMinutes === null
      ? null
      : Math.max(0, input.capacityMinutes);
  const freeMinutes =
    capacityMinutes !== null && bookedMinutes !== null
      ? Math.max(0, capacityMinutes - bookedMinutes)
      : null;

  return {
    businessSeconds,
    personalSeconds,
    loggedSeconds,
    actualBusinessPct,
    tiltBusinessPct,
    deltaPct,
    state,
    freeMinutes,
    bookedMinutes,
  };
}

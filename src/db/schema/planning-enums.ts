import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Horizon of a Target ("the bet"). `week` was added in W5 for sub-quarter bets you
 * want to know about faster than a quarterly loop; `year` is retained in the enum
 * but has no UI (Quarter is the top altitude v1 ships — discovery §11 Q9).
 */
export const targetHorizon = pgEnum("target_horizon", ["year", "quarter", "month", "week"]);

export const reservedDayType = pgEnum("reserved_day_type", ["outside", "personal"]);

// ---- Targets (W5) ----

/** How a Target is measured: a dollar figure, a count of things, or a boolean ship. */
export const targetMeasureKind = pgEnum("target_measure_kind", ["currency", "count", "shipped"]);

/**
 * Where a Target's current value comes from. `auto` measures are derived live from
 * the owning source (never persisted onto this org_shared row — see targets.ts);
 * `manual` measures hold the last-entered value.
 */
export const targetMeasureSource = pgEnum("target_measure_source", ["auto", "manual"]);

/** The source key an `auto` Target derives its current value from. */
export const targetDerivationKey = pgEnum("target_derivation_key", [
  "money_booked",
  "clients_signed",
  "milestones_shipped",
]);

/**
 * A Target's lifecycle. `met` archives off the active board (but still counts to the
 * 3-cap); `carried`/`dropped` are set by the quarterly review.
 */
export const targetState = pgEnum("target_state", ["active", "met", "carried", "dropped"]);

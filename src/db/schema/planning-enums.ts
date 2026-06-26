import { pgEnum } from "drizzle-orm/pg-core";

export const bingoCardStatus = pgEnum("bingo_card_status", ["draft", "final"]);

export const goalState = pgEnum("goal_state", ["active", "done", "backburnered"]);

export const obligationDesire = pgEnum("obligation_desire", ["obligation", "desire"]);

export const targetHorizon = pgEnum("target_horizon", ["year", "quarter", "month"]);

export const reservedDayType = pgEnum("reserved_day_type", ["outside", "personal"]);

export const planningSuggestionSurface = pgEnum("planning_suggestion_surface", [
  "quarter_spread",
  "week_draft",
  "balance_pass",
  "milestone_breakdown",
  "reserved_day",
  "check_in",
  "year_rollover",
]);

export const planningSuggestionStatus = pgEnum("planning_suggestion_status", [
  "pending",
  "staged",
  "applied",
  "dismissed",
]);

/** Center cell of the 5×5 bingo grid — always FREE (GP3). */
export const BINGO_FREE_CELL_INDEX = 12;

export const BINGO_CELL_COUNT = 25;

export const BINGO_CARD_STATUS = ["draft", "final"] as const;
export const GOAL_STATE = ["active", "done", "backburnered"] as const;
export const OBLIGATION_DESIRE = ["obligation", "desire"] as const;
export const TARGET_HORIZON = ["year", "quarter", "month"] as const;
export const RESERVED_DAY_TYPE = ["outside", "personal"] as const;
export const PLANNING_SUGGESTION_SURFACE = [
  "quarter_spread",
  "week_draft",
  "balance_pass",
  "milestone_breakdown",
  "reserved_day",
  "check_in",
  "year_rollover",
] as const;
export const PLANNING_SUGGESTION_STATUS = ["pending", "staged", "applied", "dismissed"] as const;

export const BINGO_FREE_CELL_INDEX = 12;
export const BINGO_CELL_COUNT = 25;

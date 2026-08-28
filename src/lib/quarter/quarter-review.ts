/**
 * The quarterly review ritual (W5g, discovery §6). The Sweep at the top altitude:
 * it arrives pre-answered — every ruling defaults from the data — so a close is five
 * minutes of judgment, not forty of recall. These are the pure "what does the data
 * say?" helpers the review draft is built from; nothing here reads a clock or a DB.
 */

import { isQuarterClosing, type Quarter } from "./quarter-period";

/** How a bet landed against its number. `met` when current ≥ target; `partial` at
 * or above half; otherwise `missed`. */
export type TargetOutcome = "met" | "partial" | "missed";

export function classifyOutcome(current: number, target: number): TargetOutcome {
  if (current >= target) return "met";
  if (target > 0 && current >= target / 2) return "partial";
  return "missed";
}

/** The drafted ruling on a bet: met → Done, anything short → Carry (editable to
 * Drop). Never auto-drops — dropping a bet is a judgment call the user makes. */
export type TargetRuling = "done" | "carry" | "drop";

export function draftTargetRuling(outcome: TargetOutcome): TargetRuling {
  return outcome === "met" ? "done" : "carry";
}

/** The drafted ruling on the learning track: Reached only when it has milestones and
 * they're all complete; otherwise Carry. */
export type LearningRuling = "reached" | "carry" | "drop";

export function draftLearningRuling(
  totalMilestones: number,
  completedMilestones: number
): LearningRuling {
  return totalMilestones > 0 && completedMilestones >= totalMilestones ? "reached" : "carry";
}

/** The drafted ruling on a Direction. Durable rules default to Keep — a Direction is
 * retired by choice, not because a not-yet-built Filter scored it zero (W10). */
export type DirectionRuling = "keep" | "retire";

/**
 * Where the quarter is in its life, which gates the review banner:
 * - `active` — mid-quarter; the review is one keystroke away but not surfaced.
 * - `closing` — the last ~week; the banner drafts silently and invites the close.
 * - `overdue` — past the quarter end with no close; the prior board persists, flagged.
 */
export type ReviewPhase = "active" | "closing" | "overdue";

export function reviewPhase(quarter: Quarter, now: Date, withinDays = 7): ReviewPhase {
  if (now.getTime() >= quarter.end.getTime()) return "overdue";
  return isQuarterClosing(quarter, now, withinDays) ? "closing" : "active";
}

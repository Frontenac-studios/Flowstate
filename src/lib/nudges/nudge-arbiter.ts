import type {
  EssentialNudgeChipPayload,
  EssentialNudgeKind,
} from "@/lib/nudges/essential-nudge-types";

/**
 * Shared over-commit signal (A4 / M9).
 *
 * All nudge sources (balance, goal steering, Top-3 slip/stall, morning hand-off goal offer)
 * consult `fetchIsOverCommittedForDate` — Top-3-weighted day load vs the learned threshold.
 * When true, problem-class initiations are suppressed; reassurance-class may still open the day.
 */
export function shouldSuppressProblemNudges(isOverCommitted: boolean): boolean {
  return isOverCommitted;
}

/** Problem-class priority (M7 / A4): lower number surfaces first. */
export const PROBLEM_NUDGE_PRIORITY: Record<
  Extract<
    EssentialNudgeKind,
    "top3_slip" | "balance_lopsided" | "goal_step" | "top3_stall" | "self_care_walk"
  >,
  number
> = {
  top3_slip: 0,
  balance_lopsided: 1,
  goal_step: 2,
  top3_stall: 3,
  self_care_walk: 3,
};

export function problemNudgePriority(kind: EssentialNudgeKind): number {
  if (kind in PROBLEM_NUDGE_PRIORITY) {
    return PROBLEM_NUDGE_PRIORITY[kind as keyof typeof PROBLEM_NUDGE_PRIORITY];
  }
  return 99;
}

/** Sort problem-class chips for the client arbiter queue (slip > balance > goal step). */
export function rankProblemNudges(
  chips: readonly EssentialNudgeChipPayload[]
): EssentialNudgeChipPayload[] {
  return chips
    .filter((chip) => chip.klass === "problem")
    .sort((a, b) => a.priority - b.priority || a.kind.localeCompare(b.kind));
}

/**
 * Detects project schedule slip (§5 P1 / §9.5).
 *
 * Slip when incomplete work remains past a phase end date, or when a task is
 * scheduled beyond the phase's effective end.
 */

export type SlipPhaseCandidate = {
  phaseId: string;
  phaseName: string;
  effectiveStart: string | null;
  effectiveEnd: string | null;
  incompleteTaskCount: number;
  hasTaskScheduledPastEnd: boolean;
};

export type DetectProjectSlipInput = {
  todayIso: string;
  phases: SlipPhaseCandidate[];
};

export function isPhaseSlipped(phase: SlipPhaseCandidate, todayIso: string): boolean {
  if (phase.incompleteTaskCount === 0) return false;
  if (phase.hasTaskScheduledPastEnd) return true;
  if (phase.effectiveEnd !== null && phase.effectiveEnd < todayIso) return true;
  return false;
}

export function detectProjectSlip(input: DetectProjectSlipInput): SlipPhaseCandidate[] {
  return input.phases.filter((phase) => isPhaseSlipped(phase, input.todayIso));
}

import {
  addDays,
  endOfIsoWeekSunday,
  parseISODateString,
  toISODateString,
} from "@/lib/dates/local-day";

/** Default per-task estimate when no time history exists (45m focus block). */
export const SLIP_REPLAN_DEFAULT_TASK_SECONDS = 45 * 60;

/** Assumed productive seconds per calendar day when extrapolating from time entries. */
export const SLIP_REPLAN_SECONDS_PER_DAY = 2 * 3600;

export type ReplanPhaseInput = {
  phaseId: string;
  phaseName: string;
  sortOrder: number;
  currentStart: string | null;
  currentEnd: string | null;
  timeSpentSeconds: number;
  incompleteTaskCount: number;
  completedTaskCount: number;
};

export type ReplanPhaseProposal = {
  phaseId: string;
  phaseName: string;
  startDate: string | null;
  endDate: string;
  previousStartDate: string | null;
  previousEndDate: string | null;
};

export function estimateRemainingSeconds(phase: ReplanPhaseInput): number {
  if (phase.incompleteTaskCount <= 0) return 0;
  if (phase.completedTaskCount > 0 && phase.timeSpentSeconds > 0) {
    const avg = phase.timeSpentSeconds / phase.completedTaskCount;
    return Math.ceil(avg * phase.incompleteTaskCount);
  }
  return SLIP_REPLAN_DEFAULT_TASK_SECONDS * phase.incompleteTaskCount;
}

function snapEndToWeek(iso: string): string {
  return toISODateString(endOfIsoWeekSunday(parseISODateString(iso)));
}

function daysNeededForRemaining(remainingSeconds: number): number {
  return Math.max(1, Math.ceil(remainingSeconds / SLIP_REPLAN_SECONDS_PER_DAY));
}

/**
 * Propose updated leaf phase dates from logged time and remaining task counts.
 * Phases are processed in sort order; later phases shift when they overlap.
 */
export function proposeSlipReplanDates(
  todayIso: string,
  phases: ReplanPhaseInput[]
): ReplanPhaseProposal[] {
  const sorted = [...phases].sort((a, b) => a.sortOrder - b.sortOrder);
  let cursorEnd: string | null = null;
  const proposals: ReplanPhaseProposal[] = [];

  for (const phase of sorted) {
    const remaining = estimateRemainingSeconds(phase);
    if (remaining <= 0) continue;

    const days = daysNeededForRemaining(remaining);
    let startIso = phase.currentStart;
    if (cursorEnd !== null && (startIso === null || startIso <= cursorEnd)) {
      startIso = toISODateString(addDays(parseISODateString(cursorEnd), 1));
    }
    if (startIso === null || startIso < todayIso) {
      startIso = todayIso;
    }

    const rawEnd = toISODateString(addDays(parseISODateString(startIso), days - 1));
    const endIso = snapEndToWeek(rawEnd < todayIso ? todayIso : rawEnd);

    if (phase.currentEnd !== null && endIso <= phase.currentEnd) continue;

    proposals.push({
      phaseId: phase.phaseId,
      phaseName: phase.phaseName,
      startDate: startIso,
      endDate: endIso,
      previousStartDate: phase.currentStart,
      previousEndDate: phase.currentEnd,
    });
    cursorEnd = endIso;
  }

  return proposals;
}

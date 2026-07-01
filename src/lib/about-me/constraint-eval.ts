import { parseISODateString, startOfLocalDay, toISODateString } from "@/lib/dates/local-day";

import type { ConstraintSeverity, ConstraintType } from "./constants";
import { constraintScheduleSchema, type ConstraintSchedule } from "./constraints";

/** Minimal constraint row shape for pure evaluation (server + client). */
export type EvaluableConstraint = {
  id: string;
  type: ConstraintType;
  label: string;
  schedule: ConstraintSchedule | null;
  severity: ConstraintSeverity;
};

export type ProposedSlot = {
  dateIso: string;
  startMin: number;
  endMin: number;
};

export type ConstraintViolation = {
  constraintId: string;
  label: string;
  severity: ConstraintSeverity;
  type: ConstraintType;
};

export type ConstraintEvaluation = {
  ok: boolean;
  hardViolations: ConstraintViolation[];
  softViolations: ConstraintViolation[];
};

const DAY_MINUTES = 24 * 60;

/** ISO weekday 1 = Mon … 7 = Sun (matches constraint schedule days). */
export function isoWeekdayFromIsoDate(dateIso: string): number {
  const day = parseISODateString(dateIso).getDay();
  return day === 0 ? 7 : day;
}

/** Full-day slot for date-only scheduling (week draft). */
export function dayOnlySlot(dateIso: string): ProposedSlot {
  return { dateIso, startMin: 0, endMin: DAY_MINUTES };
}

function dayMatches(schedule: ConstraintSchedule | null, isoWeekday: number): boolean {
  if (!schedule || schedule.days.length === 0) return true;
  return schedule.days.includes(isoWeekday);
}

function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function timeWindowOverlapsSlot(slot: ProposedSlot, schedule: ConstraintSchedule | null): boolean {
  if (schedule?.startMin == null && schedule?.endMin == null) {
    return true;
  }
  const wStart = schedule?.startMin ?? 0;
  const wEnd = schedule?.endMin ?? DAY_MINUTES;
  return intervalsOverlap(slot.startMin, slot.endMin, wStart, wEnd);
}

/** Working hours: violation when the slot falls outside the allowed window. */
function violatesHoursConstraint(
  slot: ProposedSlot,
  schedule: ConstraintSchedule | null,
  isoWeekday: number
): boolean {
  if (schedule?.days.length && !schedule.days.includes(isoWeekday)) {
    return true;
  }
  if (schedule?.startMin == null && schedule?.endMin == null) {
    return false;
  }
  const start = schedule?.startMin ?? 0;
  const end = schedule?.endMin ?? DAY_MINUTES;
  return slot.startMin < start || slot.endMin > end;
}

/** Commitments / preferences: violation when the slot overlaps the blocked window. */
function violatesBlockConstraint(
  slot: ProposedSlot,
  schedule: ConstraintSchedule | null,
  isoWeekday: number
): boolean {
  if (!dayMatches(schedule, isoWeekday)) return false;
  return timeWindowOverlapsSlot(slot, schedule);
}

function slotViolatesConstraint(slot: ProposedSlot, constraint: EvaluableConstraint): boolean {
  const isoWeekday = isoWeekdayFromIsoDate(slot.dateIso);
  if (constraint.type === "hours") {
    return violatesHoursConstraint(slot, constraint.schedule, isoWeekday);
  }
  return violatesBlockConstraint(slot, constraint.schedule, isoWeekday);
}

function toViolation(constraint: EvaluableConstraint): ConstraintViolation {
  return {
    constraintId: constraint.id,
    label: constraint.label,
    severity: constraint.severity,
    type: constraint.type,
  };
}

/** Evaluate a proposed time slot against user constraints (V3-2 hard vs soft). */
export function evaluateProposedSlot(
  constraints: readonly EvaluableConstraint[],
  slot: ProposedSlot
): ConstraintEvaluation {
  const hardViolations: ConstraintViolation[] = [];
  const softViolations: ConstraintViolation[] = [];

  for (const constraint of constraints) {
    if (!slotViolatesConstraint(slot, constraint)) continue;
    const violation = toViolation(constraint);
    if (constraint.severity === "hard") {
      hardViolations.push(violation);
    } else {
      softViolations.push(violation);
    }
  }

  return {
    ok: hardViolations.length === 0,
    hardViolations,
    softViolations,
  };
}

/**
 * In-app quiet (V3-3 / B3): suppress non-essential nudges outside working hours or
 * during commitment windows. Returns true when nudges should be hidden.
 */
export function shouldSuppressInAppNudges(
  now: Date,
  constraints: readonly EvaluableConstraint[]
): boolean {
  if (constraints.length === 0) return false;

  const dateIso = toISODateString(startOfLocalDay(now));
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const probe: ProposedSlot = { dateIso, startMin: nowMin, endMin: nowMin + 1 };
  const isoWeekday = isoWeekdayFromIsoDate(dateIso);

  const hoursRows = constraints.filter((c) => c.type === "hours");
  if (hoursRows.length > 0) {
    const withinWorkingHours = hoursRows.some(
      (c) => !violatesHoursConstraint(probe, c.schedule, isoWeekday)
    );
    if (!withinWorkingHours) return true;
  }

  const duringCommitment = constraints.some(
    (c) => c.type === "commitment" && violatesBlockConstraint(probe, c.schedule, isoWeekday)
  );
  if (duringCommitment) return true;

  return false;
}

/** Count soft violations for deprioritizing week-draft day picks. */
export function softConstraintViolationCount(
  constraints: readonly EvaluableConstraint[],
  dateIso: string
): number {
  if (constraints.length === 0) return 0;
  return evaluateProposedSlot(constraints, dayOnlySlot(dateIso)).softViolations.length;
}

/** Parse a DB/API constraint row into an evaluable shape (invalid schedule → null). */
export function toEvaluableConstraint(row: {
  id: string;
  type: ConstraintType;
  label: string;
  schedule: unknown;
  severity: ConstraintSeverity;
}): EvaluableConstraint {
  const parsed = row.schedule == null ? null : constraintScheduleSchema.safeParse(row.schedule);
  return {
    id: row.id,
    type: row.type,
    label: row.label,
    severity: row.severity,
    schedule: parsed?.success ? parsed.data : null,
  };
}

import { addDays, startOfLocalDay, toISODateString } from "@/lib/dates/local-day";

export type ScheduleAssignment = {
  taskId: string;
  scheduledDate: string;
};

export type ScheduleValidationError =
  | "DUPLICATE_TASK"
  | "INVALID_DATE"
  | "DATE_OUT_OF_RANGE"
  | "UNKNOWN_TASK";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Allow rescheduling within a generous planning window around today. */
export function scheduleDateBounds(now: Date = new Date()): { min: string; max: string } {
  const today = startOfLocalDay(now);
  return {
    min: toISODateString(addDays(today, -90)),
    max: toISODateString(addDays(today, 365)),
  };
}

export function isScheduleDateInBounds(iso: string, now: Date = new Date()): boolean {
  if (!ISO_DATE.test(iso)) return false;
  const { min, max } = scheduleDateBounds(now);
  return iso >= min && iso <= max;
}

export function validateScheduleAssignments(
  assignments: ScheduleAssignment[],
  ownedTaskIds: Set<string>,
  now: Date = new Date()
): { ok: true; normalized: ScheduleAssignment[] } | { ok: false; error: ScheduleValidationError } {
  const seen = new Set<string>();
  const normalized: ScheduleAssignment[] = [];

  for (const row of assignments) {
    if (seen.has(row.taskId)) {
      return { ok: false, error: "DUPLICATE_TASK" };
    }
    seen.add(row.taskId);

    if (!ownedTaskIds.has(row.taskId)) {
      return { ok: false, error: "UNKNOWN_TASK" };
    }

    if (!ISO_DATE.test(row.scheduledDate)) {
      return { ok: false, error: "INVALID_DATE" };
    }

    if (!isScheduleDateInBounds(row.scheduledDate, now)) {
      return { ok: false, error: "DATE_OUT_OF_RANGE" };
    }

    normalized.push(row);
  }

  return { ok: true, normalized };
}

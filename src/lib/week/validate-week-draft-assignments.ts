import { datesInIsoWeek, toISODateString } from "@/lib/dates/local-day";

export type WeekDraftAssignment = {
  taskId: string;
  scheduledDate: string;
};

export type WeekDraftValidationError = "DUPLICATE_TASK" | "DATE_OUT_OF_WEEK" | "UNKNOWN_TASK";

export function validateWeekDraftAssignments(
  assignments: WeekDraftAssignment[],
  ownedTaskIds: Set<string>,
  now: Date = new Date()
):
  | { ok: true; normalized: WeekDraftAssignment[] }
  | { ok: false; error: WeekDraftValidationError } {
  const weekDates = new Set(datesInIsoWeek(now).map(toISODateString));
  const seen = new Set<string>();
  const normalized: WeekDraftAssignment[] = [];

  for (const row of assignments) {
    if (seen.has(row.taskId)) {
      return { ok: false, error: "DUPLICATE_TASK" };
    }
    seen.add(row.taskId);

    if (!ownedTaskIds.has(row.taskId)) {
      return { ok: false, error: "UNKNOWN_TASK" };
    }

    if (!weekDates.has(row.scheduledDate)) {
      return { ok: false, error: "DATE_OUT_OF_WEEK" };
    }

    normalized.push(row);
  }

  return { ok: true, normalized };
}

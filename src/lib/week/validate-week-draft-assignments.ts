import {
  dayOnlySlot,
  evaluateProposedSlot,
  type EvaluableConstraint,
} from "@/lib/about-me/constraint-eval";
import { datesInIsoWeek, toISODateString } from "@/lib/dates/local-day";
import { DEFAULT_OVER_COMMIT_THRESHOLD } from "./over-commit-threshold";
import { computeDayLoad } from "./day-load";

export type WeekDraftAssignment = {
  taskId: string;
  scheduledDate: string;
};

export type WeekDraftValidationError =
  | "DUPLICATE_TASK"
  | "DATE_OUT_OF_WEEK"
  | "UNKNOWN_TASK"
  | "DAY_OVER_CAPACITY"
  | "HARD_CONSTRAINT_VIOLATION";

export type WeekDraftValidationContext = {
  protectedCountByDate: Readonly<Record<string, number>>;
  existingTasksByDate: Readonly<Record<string, readonly { id: string }[]>>;
  priorityTaskIdsByDate: Readonly<Record<string, ReadonlySet<string>>>;
  taskWeightById: Readonly<Record<string, number>>;
  overCommitThreshold?: number;
  userConstraints?: readonly EvaluableConstraint[];
};

function dayLoadForAssignments(
  date: string,
  assignments: WeekDraftAssignment[],
  ctx: WeekDraftValidationContext
): number {
  const existing = ctx.existingTasksByDate[date] ?? [];
  const assignedIds = assignments
    .filter((row) => row.scheduledDate === date)
    .map((row) => row.taskId);
  const tasks = [...existing.map((row) => ({ id: row.id })), ...assignedIds.map((id) => ({ id }))];
  return computeDayLoad(
    tasks,
    ctx.priorityTaskIdsByDate[date] ?? new Set(),
    ctx.protectedCountByDate[date] ?? 0,
    ctx.taskWeightById
  );
}

export function validateWeekDraftAssignments(
  assignments: WeekDraftAssignment[],
  ownedTaskIds: Set<string>,
  now: Date = new Date(),
  constraints?: WeekDraftValidationContext
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

  if (constraints) {
    const userConstraints = constraints.userConstraints ?? [];
    for (const row of normalized) {
      if (userConstraints.length > 0) {
        const evaluation = evaluateProposedSlot(userConstraints, dayOnlySlot(row.scheduledDate));
        if (!evaluation.ok) {
          return { ok: false, error: "HARD_CONSTRAINT_VIOLATION" };
        }
      }
    }

    const threshold = constraints.overCommitThreshold ?? DEFAULT_OVER_COMMIT_THRESHOLD;
    for (const iso of Array.from(weekDates)) {
      if (dayLoadForAssignments(iso, normalized, constraints) > threshold) {
        return { ok: false, error: "DAY_OVER_CAPACITY" };
      }
    }
  }

  return { ok: true, normalized };
}

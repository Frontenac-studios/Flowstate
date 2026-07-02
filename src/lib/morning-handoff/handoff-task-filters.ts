import type { ProjectCategory } from "@/lib/projects/categories";
import { isTriageCandidate } from "@/lib/tasks/triage-candidates";
import { matchesTodayList } from "@/lib/tasks/matches-today-list";
import { parseOccurrenceId } from "@/lib/recurrence/occurrence-id";

export type HandoffPlanTask = {
  id: string;
  title: string;
  scheduledDate: string | null;
  bucketOverride: string | null;
  completedAt: Date | null;
  projectId: string | null;
  isRecurringOccurrence?: boolean;
  recurrenceId?: string;
  occurrenceDate?: string;
  isTop3?: boolean;
  top3Order?: number | null;
  category?: ProjectCategory | null;
  categoryUnresolved?: boolean;
  projectSlug?: string | null;
};

export function filterTriageCarryovers<T extends HandoffPlanTask>(
  tasks: T[],
  todayIso: string
): T[] {
  return tasks.filter((task) => isTriageCandidate(task, todayIso));
}

/** Recurring virtual rows whose display date is today. */
export function filterRecurringDueToday<T extends HandoffPlanTask>(
  tasks: T[],
  todayIso: string
): T[] {
  return tasks.filter(
    (task) =>
      task.isRecurringOccurrence &&
      task.scheduledDate === todayIso &&
      task.completedAt == null &&
      task.recurrenceId &&
      task.occurrenceDate
  );
}

/** Non-recurring project tasks explicitly scheduled for today (week planner). */
export function filterProjectTasksDueToday<T extends HandoffPlanTask>(
  tasks: T[],
  todayIso: string
): T[] {
  return tasks.filter(
    (task) =>
      !task.isRecurringOccurrence &&
      task.projectId != null &&
      task.scheduledDate === todayIso &&
      task.completedAt == null &&
      !isTriageCandidate(task, todayIso)
  );
}

/** Incomplete tasks that belong on today's assembled list. */
export function filterAssembledTodayList<T extends HandoffPlanTask>(
  tasks: T[],
  todayIso: string
): T[] {
  return tasks.filter((task) => matchesTodayList(task, todayIso));
}

export function resolveOccurrenceKeys(task: HandoffPlanTask): {
  recurrenceId: string;
  occurrenceDate: string;
} | null {
  if (task.recurrenceId && task.occurrenceDate) {
    return { recurrenceId: task.recurrenceId, occurrenceDate: task.occurrenceDate };
  }
  const parsed = parseOccurrenceId(task.id);
  if (!parsed) return null;
  return { recurrenceId: parsed.recurrenceId, occurrenceDate: parsed.displayDate };
}

function formatClock(min: number): string {
  const h24 = Math.floor(min / 60);
  const m = min % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  const period = h24 < 12 ? "a" : "p";
  return `${h}:${String(m).padStart(2, "0")}${period}`;
}

export function formatHoldSlotLabel(startMin: number, endMin: number): string {
  return `${formatClock(startMin)} – ${formatClock(endMin)}`;
}

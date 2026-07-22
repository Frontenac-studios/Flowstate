import { addDays, parseISODateString, toISODateString } from "@/lib/dates/local-day";
import type { ProjectCategory } from "@/lib/projects/categories";
import { parseOccurrenceId } from "@/lib/recurrence/occurrence-id";
import { matchesTodayList } from "@/lib/tasks/matches-today-list";
import { isTriageCandidate } from "@/lib/tasks/triage-candidates";

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
  projectName?: string | null;
};

/** Prior days included when the user was offline (morning triage lookback). */
export const CARRYOVER_LOOKBACK_DAYS = 4;

export function filterTriageCarryovers<T extends HandoffPlanTask>(
  tasks: T[],
  todayIso: string
): T[] {
  return tasks.filter((task) => isTriageCandidate(task, todayIso));
}

/** Carryovers limited to the last few local days (offline window). */
export function filterLookbackCarryovers<T extends HandoffPlanTask>(
  tasks: T[],
  todayIso: string,
  lookbackDays: number = CARRYOVER_LOOKBACK_DAYS
): T[] {
  const earliestIso = toISODateString(addDays(parseISODateString(todayIso), -lookbackDays));

  return tasks.filter((task) => {
    if (task.completedAt !== null) return false;
    if (task.scheduledDate === null) return false;
    if (task.bucketOverride === "later") return false;
    return task.scheduledDate >= earliestIso && task.scheduledDate < todayIso;
  });
}

/** Inbox captures with no scheduled day — offered in morning triage act 3. */
export function filterInboxUnscheduled<T extends HandoffPlanTask>(tasks: T[]): T[] {
  return tasks.filter(
    (task) =>
      task.completedAt == null &&
      task.scheduledDate === null &&
      task.bucketOverride !== "later" &&
      !task.isRecurringOccurrence
  );
}

export type ProjectMorningSuggestionTier = "dueToday" | "overdue" | "light";

export type ProjectMorningSuggestion<T extends HandoffPlanTask = HandoffPlanTask> = {
  task: T;
  tier: ProjectMorningSuggestionTier;
};

function isEligibleProjectSuggestion(task: HandoffPlanTask): boolean {
  return (
    task.completedAt == null &&
    task.projectId != null &&
    !task.isRecurringOccurrence &&
    task.bucketOverride !== "later"
  );
}

/** Ranked project pulls: due today, then overdue, then lighter unscheduled picks. */
export function collectProjectMorningSuggestions<T extends HandoffPlanTask>(
  tasks: T[],
  todayIso: string
): ProjectMorningSuggestion<T>[] {
  const seen = new Set<string>();
  const suggestions: ProjectMorningSuggestion<T>[] = [];

  const push = (task: T, tier: ProjectMorningSuggestionTier) => {
    if (seen.has(task.id)) return;
    seen.add(task.id);
    suggestions.push({ task, tier });
  };

  for (const task of filterProjectTasksDueToday(tasks, todayIso)) {
    push(task, "dueToday");
  }

  for (const task of tasks) {
    if (!isEligibleProjectSuggestion(task)) continue;
    if (task.scheduledDate != null && task.scheduledDate < todayIso) {
      push(task, "overdue");
    }
  }

  for (const task of tasks) {
    if (!isEligibleProjectSuggestion(task)) continue;
    if (task.scheduledDate === null) {
      push(task, "light");
    }
  }

  return suggestions;
}

export function paceSuggestions<T>(
  items: readonly T[],
  options?: { offset?: number; batch?: number }
): { batch: T[]; hasMore: boolean; nextOffset: number } {
  const offset = options?.offset ?? 0;
  const batchSize = options?.batch ?? 5;
  const batch = items.slice(offset, offset + batchSize);
  const nextOffset = offset + batch.length;

  return {
    batch,
    hasMore: nextOffset < items.length,
    nextOffset,
  };
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

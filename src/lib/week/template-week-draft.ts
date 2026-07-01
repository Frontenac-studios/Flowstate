import { addDays, datesInIsoWeek, startOfLocalDay, toISODateString } from "@/lib/dates/local-day";
import {
  softConstraintViolationCount,
  type EvaluableConstraint,
} from "@/lib/about-me/constraint-eval";
import type { ProjectCategory } from "@/lib/projects/categories";
import { DEFAULT_OVER_COMMIT_THRESHOLD } from "@/lib/week/over-commit-threshold";
import { computeDayLoad } from "@/lib/week/day-load";
import type { WeekCategoryLoadSnapshot } from "@/lib/week/week-category-load";

export type WeekDraftTask = {
  id: string;
  title: string;
  priority: number;
  category?: ProjectCategory;
  categoryUnresolved?: boolean;
  loadWeight?: number;
};

export type WeekDraftProposal = {
  summary: string;
  assignments: { taskId: string; scheduledDate: string; rationale?: string }[];
};

export type TemplateWeekDraftOptions = {
  protectedCountByDate?: Readonly<Record<string, number>>;
  categoryLoad?: WeekCategoryLoadSnapshot;
  balanceGapCategories?: readonly ProjectCategory[];
  overCommitThreshold?: number;
  existingTasksByDate?: Readonly<Record<string, readonly { id: string }[]>>;
  priorityTaskIdsByDate?: Readonly<Record<string, ReadonlySet<string>>>;
  taskWeightById?: Readonly<Record<string, number>>;
  userConstraints?: readonly EvaluableConstraint[];
};

function dayLoad(
  iso: string,
  assignments: { taskId: string; scheduledDate: string }[],
  options: TemplateWeekDraftOptions
): number {
  const existing = options.existingTasksByDate?.[iso] ?? [];
  const assigned = assignments
    .filter((row) => row.scheduledDate === iso)
    .map((row) => ({ id: row.taskId }));
  return computeDayLoad(
    [...existing, ...assigned],
    options.priorityTaskIdsByDate?.[iso] ?? new Set(),
    options.protectedCountByDate?.[iso] ?? 0,
    options.taskWeightById
  );
}

function pickTargetDay(
  weekDates: string[],
  assignments: { taskId: string; scheduledDate: string }[],
  options: TemplateWeekDraftOptions
): string {
  const threshold = options.overCommitThreshold ?? DEFAULT_OVER_COMMIT_THRESHOLD;
  const constraints = options.userConstraints ?? [];

  const sorted = [...weekDates].sort((a, b) => {
    const loadDiff = dayLoad(a, assignments, options) - dayLoad(b, assignments, options);
    if (loadDiff !== 0) return loadDiff;
    return (
      softConstraintViolationCount(constraints, a) - softConstraintViolationCount(constraints, b)
    );
  });

  const underCap = sorted.find((iso) => dayLoad(iso, assignments, options) < threshold);
  return underCap ?? sorted[0]!;
}

/** Spread inbox tasks across the week, respecting protected load and category gaps when possible. */
export function templateWeekDraft(
  inbox: WeekDraftTask[],
  now: Date = new Date(),
  options: TemplateWeekDraftOptions = {}
): WeekDraftProposal {
  const today = startOfLocalDay(now);
  const weekDates = datesInIsoWeek(now).map(toISODateString);
  const remaining = weekDates.filter((iso) => {
    const d = new Date(iso + "T12:00:00");
    return d >= today;
  });
  const targets = remaining.length > 0 ? remaining : weekDates;

  const assignments: WeekDraftProposal["assignments"] = [];
  const gapCategories = new Set(options.balanceGapCategories ?? []);
  const sortedInbox = [...inbox].sort((a, b) => {
    const aFillsGap = a.category && !a.categoryUnresolved && gapCategories.has(a.category) ? 0 : 1;
    const bFillsGap = b.category && !b.categoryUnresolved && gapCategories.has(b.category) ? 0 : 1;
    if (aFillsGap !== bFillsGap) return aFillsGap - bFillsGap;
    return b.priority - a.priority;
  });

  for (const task of sortedInbox) {
    const scheduledDate = pickTargetDay(targets, assignments, {
      ...options,
      taskWeightById: {
        ...options.taskWeightById,
        [task.id]: task.loadWeight ?? options.taskWeightById?.[task.id] ?? 1,
      },
    });
    assignments.push({
      taskId: task.id,
      scheduledDate,
      rationale:
        task.category && !task.categoryUnresolved && gapCategories.has(task.category)
          ? "Helps balance the week"
          : "Spread across the week",
    });
  }

  const hasProtected = Object.values(options.protectedCountByDate ?? {}).some((count) => count > 0);
  const hasGaps = (options.balanceGapCategories?.length ?? 0) > 0;

  return {
    summary:
      hasProtected || hasGaps
        ? "Here is a draft that works around your protected time and nudges category balance — adjust anything that does not fit."
        : "Here is a simple draft based on your inbox — tasks are spread across the remaining days this week. Adjust anything that does not fit.",
    assignments,
  };
}

/** ISO dates for last week's Mon–Sun (relative to `ref`). */
export function lastWeekDateRange(ref: Date = new Date()): { start: string; end: string } {
  const thisMonday = datesInIsoWeek(ref)[0]!;
  const lastMonday = addDays(thisMonday, -7);
  const lastSunday = addDays(lastMonday, 6);
  return {
    start: toISODateString(lastMonday),
    end: toISODateString(lastSunday),
  };
}

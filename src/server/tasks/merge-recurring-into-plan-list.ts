import { expandOccurrences } from "@/lib/recurrence/expand";
import { formatRruleLabel } from "@/lib/recurrence/format-label";
import { makeOccurrenceId } from "@/lib/recurrence/occurrence-id";
import type { OccurrenceOverrideInput } from "@/lib/recurrence/types";
import { endOfIsoWeekSunday, startOfIsoWeekMonday, toISODateString } from "@/lib/dates/local-day";
import type { ProjectCategory } from "@/lib/projects/categories";

export type PlanListTaskRow = {
  id: string;
  title: string;
  priority: number;
  scheduledDate: string | null;
  bucketOverride: string | null;
  /** Chat-proposed day carried on an inbox task until Accept/drag commits it. */
  suggestedScheduledDate: string | null;
  projectId: string | null;
  phaseId: string | null;
  isTop3: boolean;
  top3Order: number | null;
  completedAt: Date | null;
  createdAt: Date;
  category: ProjectCategory;
  categoryUnresolved: boolean;
  tags?: string[] | null;
  timeEstimateMinutes?: number | null;
  projectSlug: string | null;
  projectName: string | null;
  phaseName: string | null;
  phaseSortOrder: number | null;
  isBlocked?: boolean;
  blockedByIds?: string[];
  unblocksCount?: number;
  /** Virtual occurrence metadata (Phase 4). */
  isRecurringOccurrence?: boolean;
  recurrenceId?: string;
  occurrenceDate?: string;
  templateTaskId?: string;
  recurringLabel?: string;
};

type RecurrenceTemplateRow = {
  recurrenceId: string;
  taskId: string;
  rrule: string;
  startDate: string;
  title: string;
  priority: number;
  bucketOverride: string | null;
  projectId: string | null;
  phaseId: string | null;
  isTop3: boolean;
  top3Order: number | null;
  completedAt: Date | null;
  createdAt: Date;
  category: ProjectCategory;
  categoryUnresolved: boolean;
  tags?: string[] | null;
  timeEstimateMinutes?: number | null;
  projectSlug: string | null;
  projectName: string | null;
  phaseName: string | null;
  phaseSortOrder: number | null;
};

type MergeParams = {
  rows: PlanListTaskRow[];
  templates: RecurrenceTemplateRow[];
  overridesByRecurrence: Map<string, OccurrenceOverrideInput[]>;
  now?: Date;
};

function applyOccurrencePatch(
  template: RecurrenceTemplateRow,
  patch: Record<string, unknown> | null
): Pick<PlanListTaskRow, "title" | "priority"> {
  if (!patch) {
    return { title: template.title, priority: template.priority };
  }
  const title = typeof patch.title === "string" ? patch.title : template.title;
  const priority =
    typeof patch.priority === "number" && patch.priority >= 0 && patch.priority <= 3
      ? patch.priority
      : template.priority;
  return { title, priority };
}

/**
 * Merge virtual recurring occurrences into an incomplete task list for the current ISO week.
 * Recurring templates (except those in the Later bucket) are replaced by their occurrences.
 */
export function mergeRecurringIntoPlanList({
  rows,
  templates,
  overridesByRecurrence,
  now = new Date(),
}: MergeParams): PlanListTaskRow[] {
  const recurringTaskIds = new Set(templates.map((t) => t.taskId));
  const window = {
    start: toISODateString(startOfIsoWeekMonday(now)),
    end: toISODateString(endOfIsoWeekSunday(now)),
  };

  const baseRows = rows.filter((row) => {
    if (!recurringTaskIds.has(row.id)) return true;
    return row.bucketOverride === "later";
  });

  const virtualRows: PlanListTaskRow[] = [];

  for (const template of templates) {
    if (template.bucketOverride === "later") continue;

    const overrides = overridesByRecurrence.get(template.recurrenceId) ?? [];
    const occurrences = expandOccurrences(template.rrule, template.startDate, window, overrides);

    for (const occurrence of occurrences) {
      const patched = applyOccurrencePatch(template, occurrence.patch);
      virtualRows.push({
        id: makeOccurrenceId(template.recurrenceId, occurrence.displayDate),
        title: patched.title,
        priority: patched.priority,
        scheduledDate: occurrence.displayDate,
        bucketOverride: null,
        suggestedScheduledDate: null,
        projectId: template.projectId,
        phaseId: template.phaseId,
        isTop3: template.isTop3,
        top3Order: template.top3Order,
        completedAt: null,
        createdAt: template.createdAt,
        category: template.category,
        categoryUnresolved: template.categoryUnresolved,
        tags: template.tags ?? [],
        timeEstimateMinutes: template.timeEstimateMinutes ?? null,
        projectSlug: template.projectSlug,
        projectName: template.projectName,
        phaseName: template.phaseName,
        phaseSortOrder: template.phaseSortOrder,
        isRecurringOccurrence: true,
        recurrenceId: template.recurrenceId,
        occurrenceDate: occurrence.occurrenceDate,
        templateTaskId: template.taskId,
        recurringLabel: formatRruleLabel(template.rrule),
      });
    }
  }

  return [...baseRows, ...virtualRows];
}

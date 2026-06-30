import { parseISODateString, startOfLocalDay } from "@/lib/dates/local-day";
import { categoryLabel, PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";
import { categorySolidVar } from "@/lib/projects/category-tokens";
import { phaseRampColor } from "@/lib/projects/project-phase-color";
import { priorityMeta } from "@/lib/tasks/priority";

import type { LensProperty, LensState } from "./lens";
import type { PlanTaskRow } from "@/components/kash/plan/TaskRow";

/** A sentinel value-key for "this property is absent on the task". */
export const LENS_NONE = "none";

const MS_PER_DAY = 86_400_000;

/** Group emitted by `groupTasks`: ordered, labelled, colored, non-empty. */
export type LensGroup = {
  /** Stable key (a category enum, priority level, projectId, due bucket, or `none`). */
  key: string;
  label: string;
  /** A CSS color for the group swatch (hex / hsl / var()). */
  color: string;
  tasks: PlanTaskRow[];
};

const NEUTRAL_COLOR = "var(--ink-muted)";

const PRIORITY_COLOR: Record<string, string> = {
  "3": "var(--due-overdue, #ef4444)",
  "2": "#f59e0b",
  "1": "#94a3b8",
  "0": NEUTRAL_COLOR,
};

const DUE_BUCKET_ORDER = ["overdue", "today", "tomorrow", "this_week", "later", LENS_NONE] as const;
type DueBucket = (typeof DUE_BUCKET_ORDER)[number];

const DUE_BUCKET_LABEL: Record<DueBucket, string> = {
  overdue: "Overdue",
  today: "Today",
  tomorrow: "Tomorrow",
  this_week: "This week",
  later: "Later",
  none: "No date",
};

const DUE_BUCKET_COLOR: Record<DueBucket, string> = {
  overdue: "var(--due-overdue)",
  today: "var(--due-soon)",
  tomorrow: "var(--due-soon)",
  this_week: "var(--due-future)",
  later: "var(--due-future)",
  none: NEUTRAL_COLOR,
};

function dueBucket(scheduledDate: string | null | undefined, today: Date): DueBucket {
  if (!scheduledDate) return LENS_NONE;
  const todayStart = startOfLocalDay(today).getTime();
  const dueStart = startOfLocalDay(parseISODateString(scheduledDate)).getTime();
  const days = Math.round((dueStart - todayStart) / MS_PER_DAY);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days <= 6) return "this_week";
  return "later";
}

/**
 * The value-key a task carries for a given lens. Always a string — missing
 * values collapse to `LENS_NONE` so they form a real filter/group bucket.
 */
export function taskLensValue(
  task: PlanTaskRow,
  prop: LensProperty,
  today: Date = new Date()
): string {
  switch (prop) {
    case "category":
      return task.category && !task.categoryUnresolved ? task.category : LENS_NONE;
    case "priority":
      return String(priorityMeta(task.priority).level);
    case "project":
      return task.projectId ?? LENS_NONE;
    case "due":
      return dueBucket(task.scheduledDate, today);
  }
}

/**
 * Keep tasks passing every active value-filter: AND across lenses, OR within a
 * lens's selected values. Lenses with no filter don't narrow. Pure.
 */
export function filterTasks(
  tasks: PlanTaskRow[],
  state: LensState,
  today: Date = new Date()
): PlanTaskRow[] {
  const active = state.active.filter((prop) => (state.filters[prop]?.length ?? 0) > 0);
  if (active.length === 0) return tasks;
  return tasks.filter((task) =>
    active.every((prop) => state.filters[prop]!.includes(taskLensValue(task, prop, today)))
  );
}

/** Default in-group sort: priority high → none, then title A→Z. Stable, pure. */
export function sortWithinGroup(tasks: PlanTaskRow[]): PlanTaskRow[] {
  return [...tasks].sort((a, b) => {
    const byPriority = priorityMeta(b.priority).level - priorityMeta(a.priority).level;
    if (byPriority !== 0) return byPriority;
    return a.title.localeCompare(b.title);
  });
}

function groupLabel(prop: LensProperty, key: string, sample?: PlanTaskRow): string {
  switch (prop) {
    case "category":
      return key === LENS_NONE ? "No category" : categoryLabel(key as ProjectCategory);
    case "priority":
      return priorityMeta(Number(key)).label;
    case "project":
      return key === LENS_NONE ? "No project" : (sample?.projectName ?? "Project");
    case "due":
      return DUE_BUCKET_LABEL[key as DueBucket];
  }
}

function groupColor(prop: LensProperty, key: string): string {
  switch (prop) {
    case "category":
      return key === LENS_NONE ? NEUTRAL_COLOR : categorySolidVar(key as ProjectCategory);
    case "priority":
      return PRIORITY_COLOR[key] ?? NEUTRAL_COLOR;
    case "project":
      return key === LENS_NONE ? NEUTRAL_COLOR : phaseRampColor(key);
    case "due":
      return DUE_BUCKET_COLOR[key as DueBucket];
  }
}

/** Canonical group order for a property — keys only, full universe. */
function groupOrder(prop: LensProperty, present: Set<string>): string[] {
  switch (prop) {
    case "category":
      return [...PROJECT_CATEGORIES, LENS_NONE];
    case "priority":
      return ["3", "2", "1", "0"];
    case "due":
      return [...DUE_BUCKET_ORDER];
    case "project": {
      // Projects have no fixed universe — order by label, `none` last.
      const ids = Array.from(present)
        .filter((k) => k !== LENS_NONE)
        .sort();
      return present.has(LENS_NONE) ? [...ids, LENS_NONE] : ids;
    }
  }
}

/**
 * Partition tasks into ordered, non-empty groups by the group lens, each sorted
 * within (priority desc, then title). Pure.
 */
export function groupTasks(
  tasks: PlanTaskRow[],
  group: LensProperty,
  today: Date = new Date()
): LensGroup[] {
  const byKey = new Map<string, PlanTaskRow[]>();
  for (const task of tasks) {
    const key = taskLensValue(task, group, today);
    const list = byKey.get(key);
    if (list) list.push(task);
    else byKey.set(key, [task]);
  }

  const order = groupOrder(group, new Set(byKey.keys()));
  const groups: LensGroup[] = [];
  for (const key of order) {
    const groupTasksForKey = byKey.get(key);
    if (!groupTasksForKey || groupTasksForKey.length === 0) continue;
    groups.push({
      key,
      label: groupLabel(group, key, groupTasksForKey[0]!),
      color: groupColor(group, key),
      tasks: sortWithinGroup(groupTasksForKey),
    });
  }
  return groups;
}

export type LensFilterOption = { value: string; label: string; color: string };

/**
 * The fixed value universe a lens can be filtered by (for the VF-3 filter chips).
 * Project has no fixed universe (values depend on the data), so it returns [] —
 * project still reveals/groups, it just has no value-filter chips in VF-3.
 */
export function lensFilterOptions(prop: LensProperty): LensFilterOption[] {
  let keys: string[];
  switch (prop) {
    case "category":
      keys = [...PROJECT_CATEGORIES, LENS_NONE];
      break;
    case "priority":
      keys = ["3", "2", "1", "0"];
      break;
    case "due":
      keys = [...DUE_BUCKET_ORDER];
      break;
    case "project":
      return [];
  }
  return keys.map((key) => ({
    value: key,
    label: groupLabel(prop, key),
    color: groupColor(prop, key),
  }));
}

export type LensResult =
  | { kind: "grouped"; groups: LensGroup[] }
  | { kind: "flat"; tasks: PlanTaskRow[] };

/**
 * Apply the active lens to a task list: filter, then group (when a group lens is
 * set) or return a flat filtered list (original order preserved). Pure — used
 * per day-section so This Week's day-groups nest cleanly (VF3/VF5).
 */
export function applyLens(
  tasks: PlanTaskRow[],
  state: LensState,
  today: Date = new Date()
): LensResult {
  const filtered = filterTasks(tasks, state, today);
  if (state.group) {
    return { kind: "grouped", groups: groupTasks(filtered, state.group, today) };
  }
  return { kind: "flat", tasks: filtered };
}

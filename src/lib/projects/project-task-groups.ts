/**
 * The project page Tasks tab (Spec v4 GroupC + RailA): group a project's open tasks
 * by Phase or by Week, and filter them by tag. Pure — the component only renders.
 */

import {
  addDays,
  parseISODateString,
  startOfIsoWeekMonday,
  toISODateString,
} from "@/lib/dates/local-day";

export type GroupableTask = {
  id: string;
  phaseId: string | null;
  scheduledDate: string | null;
  dueDate: string | null;
  tags: readonly string[] | null;
  sortOrder: number;
};

export type GroupablePhase = {
  id: string;
  name: string;
  parentPhaseId: string | null;
  sortOrder: number;
};

export type TaskGroup<T> = {
  key: string;
  label: string;
  /** Muted text beside the label, e.g. "Sep 21 – 27". */
  sub: string | null;
  tasks: T[];
};

export type GroupedTasks<T> = {
  groups: TaskGroup<T>[];
  /** Tasks with no date (Week) — shown as a quiet "No date · n tasks" line. */
  undated: T[];
};

// ---- tag filter ---------------------------------------------------------------

/** Per tag (lower-cased): include it, or exclude it. Absent = no opinion. */
export type TagFilter = Readonly<Record<string, "include" | "exclude">>;

/** Click cycles a tag: off → include → exclude → off ("click again to exclude"). */
export function cycleTagFilter(filter: TagFilter, tag: string): TagFilter {
  const key = tag.toLowerCase();
  const next = { ...filter };
  if (!next[key]) next[key] = "include";
  else if (next[key] === "include") next[key] = "exclude";
  else delete next[key];
  return next;
}

/**
 * Included tags are OR'd (same as the Today chips); any excluded tag removes the
 * task. An empty filter keeps everything.
 */
export function applyTagFilter<T extends Pick<GroupableTask, "tags">>(
  tasks: readonly T[],
  filter: TagFilter
): T[] {
  const include = Object.keys(filter).filter((k) => filter[k] === "include");
  const exclude = Object.keys(filter).filter((k) => filter[k] === "exclude");
  if (include.length === 0 && exclude.length === 0) return [...tasks];
  return tasks.filter((t) => {
    const tags = (t.tags ?? []).map((x) => x.toLowerCase());
    if (exclude.some((x) => tags.includes(x))) return false;
    return include.length === 0 || include.some((x) => tags.includes(x));
  });
}

/** Distinct tags across tasks with counts, most used first (display casing kept). */
export function tagCounts(
  tasks: readonly Pick<GroupableTask, "tags">[]
): { tag: string; count: number }[] {
  const byKey = new Map<string, { tag: string; count: number }>();
  for (const t of tasks) {
    const seen = new Set<string>();
    for (const tag of t.tags ?? []) {
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const entry = byKey.get(key) ?? { tag, count: 0 };
      entry.count += 1;
      byKey.set(key, entry);
    }
  }
  return Array.from(byKey.values()).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

// ---- week grouping ------------------------------------------------------------

/** The day a task sits on in time: its planned day, else its deadline. */
export function taskWeekDate(t: Pick<GroupableTask, "scheduledDate" | "dueDate">): string | null {
  return t.scheduledDate ?? t.dueDate ?? null;
}

function shortRange(start: Date): string {
  const end = addDays(start, 6);
  const month = (d: Date) => d.toLocaleDateString("en-US", { month: "short" });
  return start.getMonth() === end.getMonth()
    ? `${month(start)} ${start.getDate()} – ${end.getDate()}`
    : `${month(start)} ${start.getDate()} – ${month(end)} ${end.getDate()}`;
}

function byDateThenOrder<T extends GroupableTask>(a: T, b: T): number {
  const ad = taskWeekDate(a) ?? "";
  const bd = taskWeekDate(b) ?? "";
  return ad !== bd ? ad.localeCompare(bd) : a.sortOrder - b.sortOrder;
}

/**
 * "Earlier" (anything before this week — overdue), "This week", "Next week", then one
 * group per later week labelled by its range; undated tasks come back separately.
 * Weeks run Monday–Sunday, like the rest of the app.
 */
export function groupTasksByWeek<T extends GroupableTask>(
  tasks: readonly T[],
  today: Date
): GroupedTasks<T> {
  const thisWeek = startOfIsoWeekMonday(today);
  const thisKey = toISODateString(thisWeek);
  const nextKey = toISODateString(addDays(thisWeek, 7));
  const byWeek = new Map<string, T[]>();
  const undated: T[] = [];

  for (const t of tasks) {
    const iso = taskWeekDate(t);
    if (!iso) {
      undated.push(t);
      continue;
    }
    const week = toISODateString(startOfIsoWeekMonday(parseISODateString(iso)));
    const key = week < thisKey ? "earlier" : week;
    byWeek.set(key, [...(byWeek.get(key) ?? []), t]);
  }

  const keys = Array.from(byWeek.keys()).sort((a, b) =>
    a === "earlier" ? -1 : b === "earlier" ? 1 : a.localeCompare(b)
  );
  const groups = keys.map((key): TaskGroup<T> => {
    const list = (byWeek.get(key) ?? []).slice().sort(byDateThenOrder);
    if (key === "earlier") return { key, label: "Earlier", sub: "Overdue", tasks: list };
    const start = parseISODateString(key);
    if (key === thisKey) return { key, label: "This week", sub: shortRange(start), tasks: list };
    if (key === nextKey) return { key, label: "Next week", sub: shortRange(start), tasks: list };
    return { key, label: shortRange(start), sub: null, tasks: list };
  });

  return { groups, undated: undated.sort((a, b) => a.sortOrder - b.sortOrder) };
}

// ---- phase grouping -----------------------------------------------------------

/**
 * One group per top-level phase in plan order; a task in a subphase belongs to its
 * top-level ancestor. Tasks with no phase close the list as "No phase".
 */
export function groupTasksByPhase<T extends GroupableTask>(
  tasks: readonly T[],
  phases: readonly GroupablePhase[]
): GroupedTasks<T> {
  const byId = new Map(phases.map((p) => [p.id, p]));
  const rootOf = (id: string): string => {
    let current = byId.get(id);
    const seen = new Set<string>();
    while (current?.parentPhaseId && !seen.has(current.id)) {
      seen.add(current.id);
      const parent = byId.get(current.parentPhaseId);
      if (!parent) break;
      current = parent;
    }
    return current?.id ?? id;
  };

  const byRoot = new Map<string, T[]>();
  const loose: T[] = [];
  for (const t of tasks) {
    if (!t.phaseId || !byId.has(t.phaseId)) {
      loose.push(t);
      continue;
    }
    const root = rootOf(t.phaseId);
    byRoot.set(root, [...(byRoot.get(root) ?? []), t]);
  }

  const roots = phases
    .filter((p) => p.parentPhaseId == null && byRoot.has(p.id))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const groups: TaskGroup<T>[] = roots.map((p) => ({
    key: p.id,
    label: p.name,
    sub: null,
    tasks: (byRoot.get(p.id) ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder),
  }));
  if (loose.length > 0) {
    groups.push({
      key: "no-phase",
      label: "No phase",
      sub: null,
      tasks: loose.sort((a, b) => a.sortOrder - b.sortOrder),
    });
  }
  return { groups, undated: [] };
}

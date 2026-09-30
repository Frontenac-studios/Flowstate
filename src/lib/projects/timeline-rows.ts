/**
 * Spec v4 Timeline tab (TimelineA + ExpandA + MarkA + DepthB): flatten a project's
 * phase tree into the rows the chart draws. Pure — the component only positions them.
 *
 * - Two levels show at a time (DepthB). `windowTop` is the upper visible level
 *   (1-based); the level just above it becomes a caps section header with a progress
 *   line, and anything above that only nests.
 * - A top-of-window phase row expands to its child phases (the lower level) and its
 *   own tasks; a lower-level phase expands to every task beneath it.
 * - A phase with no effective dates is "Not planned": it still gets a row, faded.
 */

import { effectiveDueDate } from "@/lib/tasks/overdue";

import {
  resolveEffectivePhaseRange,
  type PhaseDateRange,
  type PhaseTreeNode,
  type ProjectTree,
} from "./phase-tree";

export type TimelinePhase = {
  id: string;
  parentPhaseId: string | null;
  sortOrder: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
};

export type TimelineTask = {
  id: string;
  title: string;
  phaseId: string | null;
  sortOrder: number;
  scheduledDate: string | null;
  dueDate: string | null;
  completedAt: Date | null;
};

export type MarkStatus = "open" | "done" | "today" | "overdue";

export type TaskMark = { start: string; end: string; status: MarkStatus };

export type TimelineRow =
  | {
      kind: "section";
      key: string;
      label: string;
      done: number;
      total: number;
    }
  | {
      kind: "phase";
      key: string;
      phaseId: string;
      name: string;
      /** 0 = top of the window (48px row), 1 = the level below (40px, indented). */
      level: 0 | 1;
      range: PhaseDateRange;
      planned: boolean;
      done: number;
      total: number;
      expandable: boolean;
      expanded: boolean;
    }
  | {
      kind: "task";
      key: string;
      taskId: string;
      title: string;
      /** Indent step of the owning phase row (0 or 1). */
      level: 0 | 1;
      done: boolean;
      mark: TaskMark | null;
    };

type Node = PhaseTreeNode<TimelinePhase, TimelineTask>;

function subtreeTasks(node: Node): TimelineTask[] {
  return [...node.tasks, ...node.children.flatMap(subtreeTasks)];
}

function counts(tasks: readonly TimelineTask[]): { done: number; total: number } {
  return { done: tasks.filter((t) => t.completedAt != null).length, total: tasks.length };
}

/** A task's bar: planned day → deadline (either alone is a one-day pill). */
export function taskMark(task: TimelineTask, todayIso: string): TaskMark | null {
  const a = task.scheduledDate ?? task.dueDate;
  const b = task.dueDate ?? task.scheduledDate;
  if (!a || !b) return null;
  const [start, end] = a <= b ? [a, b] : [b, a];
  let status: MarkStatus = "open";
  if (task.completedAt != null) status = "done";
  else {
    const due = effectiveDueDate(task);
    if (due != null && due < todayIso) status = "overdue";
    else if (end === todayIso) status = "today";
  }
  return { start, end, status };
}

/** Deepest phase level in the tree (1 = only top-level phases, 0 = no phases). */
export function maxPhaseDepth(tree: ProjectTree<TimelinePhase, TimelineTask>): number {
  const depth = (n: Node): number => 1 + Math.max(0, ...n.children.map(depth));
  return Math.max(0, ...tree.rootPhases.map(depth));
}

export function buildTimelineRows(input: {
  tree: ProjectTree<TimelinePhase, TimelineTask>;
  expanded: ReadonlySet<string>;
  /** Upper visible level, 1-based (1 → levels 1–2). */
  windowTop: number;
  todayIso: string;
}): TimelineRow[] {
  const { tree, expanded, windowTop, todayIso } = input;
  const rows: TimelineRow[] = [];

  const pushTasks = (tasks: readonly TimelineTask[], level: 0 | 1) => {
    for (const t of [...tasks].sort((a, b) => a.sortOrder - b.sortOrder)) {
      rows.push({
        kind: "task",
        key: `task:${t.id}`,
        taskId: t.id,
        title: t.title,
        level,
        done: t.completedAt != null,
        mark: taskMark(t, todayIso),
      });
    }
  };

  const phaseRow = (node: Node, level: 0 | 1) => {
    const range = resolveEffectivePhaseRange(node);
    const all = subtreeTasks(node);
    const hasChildrenInWindow = level === 0 && node.children.length > 0;
    const isOpen = expanded.has(node.phase.id);
    rows.push({
      kind: "phase",
      key: `phase:${node.phase.id}`,
      phaseId: node.phase.id,
      name: node.phase.name,
      level,
      range,
      planned: range.start != null && range.end != null,
      ...counts(all),
      expandable: hasChildrenInWindow || all.length > 0,
      expanded: isOpen,
    });
    if (!isOpen) return;
    if (level === 0) {
      for (const child of node.children) phaseRow(child, 1);
      pushTasks(node.tasks, 0);
    } else {
      pushTasks(all, 1);
    }
  };

  const visit = (node: Node, depth: number, trail: string[]) => {
    if (depth === windowTop) {
      phaseRow(node, 0);
      return;
    }
    // A header only when something sits under it inside the window.
    if (depth === windowTop - 1 && node.children.length > 0) {
      rows.push({
        kind: "section",
        key: `section:${node.phase.id}`,
        label: [...trail, node.phase.name].join(" › "),
        ...counts(subtreeTasks(node)),
      });
    }
    for (const child of node.children) visit(child, depth + 1, [...trail, node.phase.name]);
  };

  for (const root of tree.rootPhases) visit(root, 1, []);

  if (windowTop === 1 && tree.looseTasks.length > 0) {
    rows.push({
      kind: "section",
      key: "section:loose",
      label: "No phase",
      ...counts(tree.looseTasks),
    });
    pushTasks(tree.looseTasks, 0);
  }
  return rows;
}

/** Phases at the top of the window with no dates — the rail's "Not planned" tray. */
export function unplannedPhases(
  tree: ProjectTree<TimelinePhase, TimelineTask>,
  windowTop: number
): { id: string; name: string; taskCount: number }[] {
  const out: { id: string; name: string; taskCount: number }[] = [];
  const visit = (node: Node, depth: number) => {
    if (depth === windowTop) {
      const range = resolveEffectivePhaseRange(node);
      if (range.start == null || range.end == null) {
        out.push({
          id: node.phase.id,
          name: node.phase.name,
          taskCount: subtreeTasks(node).length,
        });
      }
      return;
    }
    node.children.forEach((c) => visit(c, depth + 1));
  };
  tree.rootPhases.forEach((r) => visit(r, 1));
  return out;
}

/** Every date the chart must cover: phase ranges, task marks, milestones, today. */
export function timelineSpan(
  rowsDates: readonly (string | null | undefined)[],
  todayIso: string
): { start: string; end: string } {
  const dates = [...rowsDates.filter((d): d is string => !!d), todayIso].sort();
  return { start: dates[0]!, end: dates[dates.length - 1]! };
}

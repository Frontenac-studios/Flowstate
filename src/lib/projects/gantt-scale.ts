/**
 * Pure timeline math for the project Calendar (Gantt) board. Kept out of React
 * so it can be unit-tested. ISO date strings are `YYYY-MM-DD` and compare
 * correctly lexicographically.
 */

import { addDays, parseISODateString, toISODateString } from "@/lib/dates/local-day";

import {
  resolveEffectivePhaseRange,
  type PhaseShape,
  type PhaseTreeNode,
  type ProjectTree,
  type TaskShape,
} from "./phase-tree";

export type GanttSpan = { start: string; end: string };
export type GanttGranularity = "day" | "week" | "month";
export type GanttTick = { iso: string; label: string; dayOffset: number };

const MS_PER_DAY = 86_400_000;

/** Minimal phase shape needed for span derivation (satisfies derivePhaseRange). */
type DatedPhaseShape = {
  id: string;
  parentPhaseId: string | null;
  sortOrder: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
};
type TaskShapeLite = TaskShape;

/** Overall project span: min start / max end across all effective phase ranges. */
export function computeProjectSpan<P extends DatedPhaseShape, T extends TaskShapeLite>(
  tree: ProjectTree<P, T>
): GanttSpan | null {
  let start: string | null = null;
  let end: string | null = null;
  for (const node of tree.rootPhases) {
    const range = resolveEffectivePhaseRange(node);
    if (range.start !== null && (start === null || range.start < start)) start = range.start;
    if (range.end !== null && (end === null || range.end > end)) end = range.end;
  }
  return start !== null && end !== null ? { start, end } : null;
}

/** Whole-day offset of `iso` from `originIso` (0 = same day). */
export function dayIndex(iso: string, originIso: string): number {
  const ms = parseISODateString(iso).getTime() - parseISODateString(originIso).getTime();
  return Math.round(ms / MS_PER_DAY);
}

/** Inclusive day count of a span (start === end ⇒ 1). */
export function totalDays(span: GanttSpan): number {
  return dayIndex(span.end, span.start) + 1;
}

/** ISO date `dayOffset` days after `originIso`. Inverse of dayIndex. */
export function offsetToDate(dayOffset: number, originIso: string): string {
  return toISODateString(addDays(parseISODateString(originIso), dayOffset));
}

export function daysToPx(days: number, pxPerDay: number): number {
  return days * pxPerDay;
}

/** Pixels → whole days (snap-to-day). */
export function pxToDays(px: number, pxPerDay: number): number {
  if (pxPerDay <= 0) return 0;
  return Math.round(px / pxPerDay);
}

/** Pick tick granularity from the current zoom (px per day). */
export function suggestGranularity(pxPerDay: number): GanttGranularity {
  if (pxPerDay >= 22) return "day";
  if (pxPerDay >= 6) return "week";
  return "month";
}

function dayLabel(iso: string): string {
  return parseISODateString(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function monthLabel(iso: string): string {
  return parseISODateString(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/** Axis ticks across a span at the given granularity (caller maps dayOffset→px). */
export function buildTicks(span: GanttSpan, granularity: GanttGranularity): GanttTick[] {
  const ticks: GanttTick[] = [];
  const total = totalDays(span);

  for (let i = 0; i < total; i += 1) {
    const iso = offsetToDate(i, span.start);
    const date = parseISODateString(iso);
    if (granularity === "day") {
      ticks.push({ iso, label: dayLabel(iso), dayOffset: i });
    } else if (granularity === "week") {
      // Monday gridlines, plus the very first day so the axis isn't empty-left.
      if (i === 0 || date.getDay() === 1) ticks.push({ iso, label: dayLabel(iso), dayOffset: i });
    } else {
      // Month starts, plus the first day.
      if (i === 0 || date.getDate() === 1)
        ticks.push({ iso, label: monthLabel(iso), dayOffset: i });
    }
  }
  return ticks;
}

export type GanttFlatRow<P extends PhaseShape, T extends TaskShape> = {
  node: PhaseTreeNode<P, T>;
  depth: number;
  isLeaf: boolean;
};

/** Depth-first flatten of the phase tree into ordered rows for the board. */
export function flattenTree<P extends PhaseShape, T extends TaskShape>(
  tree: ProjectTree<P, T>
): GanttFlatRow<P, T>[] {
  const rows: GanttFlatRow<P, T>[] = [];
  const walk = (nodes: PhaseTreeNode<P, T>[], depth: number) => {
    for (const node of nodes) {
      rows.push({ node, depth, isLeaf: node.children.length === 0 });
      walk(node.children, depth + 1);
    }
  };
  walk(tree.rootPhases, 0);
  return rows;
}

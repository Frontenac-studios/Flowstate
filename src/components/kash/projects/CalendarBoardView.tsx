"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Button from "@/components/kash/ui/Button";
import { addDays, startOfLocalDay, toISODateString } from "@/lib/dates/local-day";
import { type ProjectCategory } from "@/lib/projects/categories";
import { categoryFillVar, categorySolidVar, categoryTextVar } from "@/lib/projects/category-tokens";
import {
  buildTicks,
  computeProjectSpan,
  dayIndex,
  flattenTree,
  suggestGranularity,
  totalDays,
  type GanttGranularity,
} from "@/lib/projects/gantt-scale";
import { resolveEffectivePhaseRange, type ProjectTree } from "@/lib/projects/phase-tree";

import { InPageSwitcher } from "../InPageSwitcher";
import GanttAxis from "./GanttAxis";
import GanttRow, { GANTT_LABEL_WIDTH, GANTT_ROW_HEIGHT } from "./GanttRow";
import type { ProjectPhase, ProjectTask } from "./types";
import { useProjectMutations } from "./useProjectMutations";

type Tree = ProjectTree<ProjectPhase, ProjectTask>;

type Props = {
  tree: Tree;
  projectId: string;
  category: ProjectCategory;
};

const MIN_PX_PER_DAY = 3;
const MAX_PX_PER_DAY = 60;
const GRANULARITY_PX: Record<GanttGranularity, number> = { day: 28, week: 10, month: 4 };
const GRANULARITY_OPTIONS: ReadonlyArray<{ value: GanttGranularity; label: string }> = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

function clampPxPerDay(px: number): number {
  return Math.min(MAX_PX_PER_DAY, Math.max(MIN_PX_PER_DAY, px));
}

export default function CalendarBoardView({ tree, projectId, category }: Props) {
  const m = useProjectMutations(projectId);
  const scrollRef = useRef<HTMLDivElement>(null);

  const span = useMemo(() => computeProjectSpan(tree), [tree]);
  const rows = useMemo(() => flattenTree(tree), [tree]);
  const color = categorySolidVar(category);

  const [pxPerDay, setPxPerDay] = useState(GRANULARITY_PX.day);
  const [granularityOverride, setGranularityOverride] = useState<GanttGranularity | "auto">("auto");
  const [fitMode, setFitMode] = useState(true);

  const fitToWidth = useCallback(() => {
    if (!span || !scrollRef.current) return;
    const avail = scrollRef.current.clientWidth - GANTT_LABEL_WIDTH;
    if (avail <= 0) return;
    setPxPerDay(clampPxPerDay(avail / totalDays(span)));
  }, [span]);

  // Fit on mount / span change, and on container resize while in fit mode.
  useEffect(() => {
    if (!fitMode) return;
    fitToWidth();
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const obs = new ResizeObserver(() => fitToWidth());
    obs.observe(el);
    return () => obs.disconnect();
  }, [fitMode, fitToWidth]);

  const granularity: GanttGranularity =
    granularityOverride === "auto" ? suggestGranularity(pxPerDay) : granularityOverride;

  const total = span ? totalDays(span) : 0;
  const boardWidth = total * pxPerDay;
  const ticks = useMemo(() => (span ? buildTicks(span, granularity) : []), [span, granularity]);

  const todayIso = toISODateString(startOfLocalDay());
  const todayOffset = span ? dayIndex(todayIso, span.start) : -1;
  const showToday = span !== null && todayOffset >= 0 && todayOffset < total;

  const isUndatedLeaf = (r: (typeof rows)[number]) => {
    if (!r.isLeaf) return false;
    const range = resolveEffectivePhaseRange(r.node);
    return range.start === null || range.end === null;
  };
  const undatedLeaves = rows.filter(isUndatedLeaf);
  const boardRows = rows.filter((r) => !isUndatedLeaf(r));

  const commitDates = useCallback(
    (phaseId: string, startIso: string, endIso: string) => {
      m.updatePhase.mutate({ id: phaseId, startDate: startIso, endDate: endIso });
    },
    [m.updatePhase]
  );

  const seedDates = useCallback(
    (phaseId: string) => {
      const start = toISODateString(startOfLocalDay());
      const end = toISODateString(addDays(startOfLocalDay(), 6));
      m.updatePhase.mutate({ id: phaseId, startDate: start, endDate: end });
    },
    [m.updatePhase]
  );

  const setZoom = (factor: number) => {
    setFitMode(false);
    setGranularityOverride("auto");
    setPxPerDay((px) => clampPxPerDay(px * factor));
  };

  const setGranularity = (g: GanttGranularity) => {
    setFitMode(false);
    setGranularityOverride(g);
    setPxPerDay(GRANULARITY_PX[g]);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <InPageSwitcher
          options={GRANULARITY_OPTIONS}
          value={granularityOverride}
          onChange={setGranularity}
          ariaLabel="Zoom granularity"
        />
        <Button type="button" variant="ghost" onClick={() => setZoom(1 / 1.4)}>
          −
        </Button>
        <Button type="button" variant="ghost" onClick={() => setZoom(1.4)}>
          +
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setGranularityOverride("auto");
            setFitMode(true);
          }}
        >
          Fit
        </Button>
      </div>

      {span === null ? (
        <div className="glass-panel-opaque px-6 py-10 text-center text-ink-muted">
          No dated phases yet. Schedule tasks in a phase or set dates manually to plot it on the
          calendar.
        </div>
      ) : (
        <div ref={scrollRef} className="glass-panel-opaque overflow-x-auto">
          <div style={{ width: GANTT_LABEL_WIDTH + boardWidth }}>
            <GanttAxis ticks={ticks} pxPerDay={pxPerDay} boardWidth={boardWidth} />
            <div className="relative">
              {showToday ? (
                <div
                  className="pointer-events-none absolute top-0 z-10 w-px bg-accent"
                  style={{
                    left: GANTT_LABEL_WIDTH + todayOffset * pxPerDay,
                    height: boardRows.length * GANTT_ROW_HEIGHT,
                  }}
                  aria-hidden
                />
              ) : null}
              {boardRows.map((r) => (
                <GanttRow
                  key={r.node.phase.id}
                  node={r.node}
                  depth={r.depth}
                  isLeaf={r.isLeaf}
                  originIso={span.start}
                  pxPerDay={pxPerDay}
                  boardWidth={boardWidth}
                  color={color}
                  onCommit={commitDates}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {undatedLeaves.length > 0 ? (
        <div className="glass-panel-opaque p-4">
          <h3 className="mb-2 text-sm font-medium text-ink">Undated phases</h3>
          <p className="mb-3 text-xs text-ink-muted">
            These leaf phases have no dates and no scheduled tasks. Click one to set manual dates
            (today → +6 days).
          </p>
          <ul className="flex flex-wrap gap-2">
            {undatedLeaves.map((r) => (
              <li key={r.node.phase.id}>
                <button
                  type="button"
                  onClick={() => seedDates(r.node.phase.id)}
                  disabled={m.updatePhase.isPending}
                  className="rounded-full border border-transparent px-3 py-1 text-sm font-medium transition disabled:opacity-50"
                  style={{
                    backgroundColor: categoryFillVar(category),
                    color: categoryTextVar(category),
                  }}
                >
                  {r.node.phase.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

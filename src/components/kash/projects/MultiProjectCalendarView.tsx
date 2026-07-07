"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Button from "@/components/kash/ui/Button";
import { categorySolidVar } from "@/lib/projects/category-tokens";
import {
  readCalendarColorMode,
  writeCalendarColorMode,
  type CalendarColorMode,
} from "@/lib/projects/calendar-color-mode";
import {
  buildTicks,
  suggestGranularity,
  totalDays,
  type GanttGranularity,
} from "@/lib/projects/gantt-scale";
import { projectIndexById } from "@/lib/projects/multi-project-calendar";
import { projectCalendarSolidVar } from "@/lib/projects/project-cycle-color";
import { useTRPC } from "@/trpc/client";

import { InPageSwitcher } from "../InPageSwitcher";
import CalendarColorLegend from "./CalendarColorLegend";
import GanttAxis from "./GanttAxis";
import MultiProjectGanttRow, { MULTI_GANTT_LABEL_WIDTH } from "./MultiProjectGanttRow";

const MIN_PX_PER_DAY = 3;
const MAX_PX_PER_DAY = 60;
const GRANULARITY_PX: Record<GanttGranularity, number> = { day: 28, week: 10, month: 4 };

function clampPxPerDay(px: number): number {
  return Math.min(MAX_PX_PER_DAY, Math.max(MIN_PX_PER_DAY, px));
}

export default function MultiProjectCalendarView() {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(trpc.projects.multiProjectCalendar.queryOptions());
  const scrollRef = useRef<HTMLDivElement>(null);
  const [colorMode, setColorMode] = useState<CalendarColorMode>(() => readCalendarColorMode());
  const [pxPerDay, setPxPerDay] = useState(GRANULARITY_PX.day);
  const [granularityOverride, setGranularityOverride] = useState<GanttGranularity | "auto">("auto");
  const [fitMode, setFitMode] = useState(true);

  const span = data?.span ?? null;
  const rows = data?.rows ?? [];
  const projects = useMemo(() => data?.projects ?? [], [data?.projects]);
  const projectIndexes = useMemo(() => projectIndexById(projects), [projects]);

  const fitToWidth = useCallback(() => {
    if (!span || !scrollRef.current) return;
    const avail = scrollRef.current.clientWidth - MULTI_GANTT_LABEL_WIDTH;
    if (avail <= 0) return;
    setPxPerDay(clampPxPerDay(avail / totalDays(span)));
  }, [span]);

  useEffect(() => {
    if (!fitMode) return;
    fitToWidth();
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const obs = new ResizeObserver(() => fitToWidth());
    obs.observe(el);
    return () => obs.disconnect();
  }, [fitMode, fitToWidth]);

  const granularity =
    granularityOverride === "auto" ? suggestGranularity(pxPerDay) : granularityOverride;
  const total = span ? totalDays(span) : 0;
  const boardWidth = total * pxPerDay;
  const ticks = useMemo(() => (span ? buildTicks(span, granularity) : []), [span, granularity]);

  if (isLoading) return <p className="text-ink-muted">Loading calendar…</p>;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <InPageSwitcher
          options={[
            { value: "category", label: "Category" },
            { value: "project", label: "Project" },
          ]}
          value={colorMode}
          onChange={(m) => {
            setColorMode(m);
            writeCalendarColorMode(m);
          }}
          ariaLabel="Calendar color mode"
        />
        <div className="flex flex-wrap items-center gap-2">
          <InPageSwitcher
            options={[
              { value: "day", label: "Day" },
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
            ]}
            value={granularityOverride}
            onChange={(g) => {
              setFitMode(false);
              setGranularityOverride(g);
              setPxPerDay(GRANULARITY_PX[g]);
            }}
            ariaLabel="Zoom granularity"
          />
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setFitMode(false);
              setPxPerDay((p) => clampPxPerDay(p * 1.4));
            }}
          >
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
      </div>
      <CalendarColorLegend
        mode={colorMode}
        projects={projects.map((p) => ({ ...p, projectIndex: projectIndexes.get(p.id) ?? 0 }))}
      />
      {span === null || rows.length === 0 ? (
        <div className="rounded-card border border-subtle bg-surface px-6 py-10 text-center text-ink-muted shadow-surface">
          No dated phases yet across your projects.
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="overflow-x-auto rounded-card border border-subtle bg-surface shadow-surface"
        >
          <div style={{ width: MULTI_GANTT_LABEL_WIDTH + boardWidth }}>
            <GanttAxis
              ticks={ticks}
              pxPerDay={pxPerDay}
              boardWidth={boardWidth}
              labelWidth={MULTI_GANTT_LABEL_WIDTH}
            />
            {rows.map((row, index) => (
              <MultiProjectGanttRow
                key={`${row.projectId}:${row.phaseId}`}
                row={row}
                originIso={span.start}
                pxPerDay={pxPerDay}
                boardWidth={boardWidth}
                color={
                  colorMode === "category"
                    ? categorySolidVar(row.category)
                    : projectCalendarSolidVar(projectIndexes.get(row.projectId) ?? 0, row.category)
                }
                showProjectName={row.projectId !== rows[index - 1]?.projectId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

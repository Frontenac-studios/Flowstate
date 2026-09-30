"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent } from "react";

import { InPageSwitcher } from "@/components/kash/InPageSwitcher";
import { useOptionalToast } from "@/components/kash/ui/ToastProvider";
import {
  CalendarRange,
  ChevronRight,
  GripVertical,
  Layers,
  ZoomIn,
} from "@/components/kash/ui/icon";
import { cn } from "@/lib/cn";
import { addDays, parseISODateString, toISODateString } from "@/lib/dates/local-day";
import { dayIndex, totalDays } from "@/lib/projects/gantt-scale";
import type { ProjectTree } from "@/lib/projects/phase-tree";
import { projectFillVar, projectSolidVar, projectTextVar } from "@/lib/projects/project-hue";
import {
  buildTimelineRows,
  maxPhaseDepth,
  timelineSpan,
  unplannedPhases,
  type MarkStatus,
  type TimelineRow,
} from "@/lib/projects/timeline-rows";
import { useTRPC } from "@/trpc/client";

import ProjectRail from "./ProjectRail";
import type { ProjectDetail, ProjectMilestone, ProjectPhase, ProjectTask } from "./types";

type Zoom = "weeks" | "months";
const ZOOM_KEY = "kash.project.timelineZoom";
const NAME_COL = 200;
const PX_PER_DAY_WEEKS = 18;
/** A phase dropped from the Not planned tray gets two weeks to start with. */
const DROPPED_PHASE_DAYS = 14;

const ZOOM_OPTIONS = [
  { value: "weeks" as const, label: "Weeks" },
  { value: "months" as const, label: "Months" },
];

function monthStarts(start: string, end: string): string[] {
  const out: string[] = [];
  const d = parseISODateString(start);
  d.setDate(1);
  if (toISODateString(d) < start) d.setMonth(d.getMonth() + 1);
  while (toISODateString(d) <= end) {
    out.push(toISODateString(d));
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

function mondays(start: string, end: string): string[] {
  const out: string[] = [];
  let d = parseISODateString(start);
  while (d.getDay() !== 1) d = addDays(d, 1);
  while (toISODateString(d) <= end) {
    out.push(toISODateString(d));
    d = addDays(d, 7);
  }
  return out;
}

export default function ProjectTimelineTab({
  project,
  phases,
  tree,
  milestones,
}: {
  project: ProjectDetail;
  phases: ProjectPhase[];
  tree: ProjectTree<ProjectPhase, ProjectTask>;
  milestones: ProjectMilestone[];
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const toast = useOptionalToast();
  const [zoom, setZoom] = useState<Zoom>("weeks");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [windowTop, setWindowTop] = useState(1);
  const axisRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(ZOOM_KEY);
      if (saved === "weeks" || saved === "months") setZoom(saved);
    } catch {
      /* private mode */
    }
  }, []);

  const todayIso = toISODateString(new Date());
  const depth = useMemo(() => maxPhaseDepth(tree), [tree]);
  // Keep the window inside the tree when phases are removed.
  const top = Math.max(1, Math.min(windowTop, Math.max(1, depth - 1)));

  const rows = useMemo(
    () => buildTimelineRows({ tree, expanded, windowTop: top, todayIso }),
    [tree, expanded, top, todayIso]
  );
  const tray = useMemo(() => unplannedPhases(tree, top), [tree, top]);

  const span = useMemo(() => {
    const dates: (string | null)[] = [];
    for (const r of rows) {
      if (r.kind === "phase") dates.push(r.range.start, r.range.end);
      if (r.kind === "task" && r.mark) dates.push(r.mark.start, r.mark.end);
    }
    for (const p of phases) dates.push(p.startDate, p.endDate);
    for (const m of milestones) dates.push(m.targetDate);
    const raw = timelineSpan(dates, todayIso);
    // A little air either side: back to the Monday before, a week past the end.
    let s = parseISODateString(raw.start);
    while (s.getDay() !== 1) s = addDays(s, -1);
    return {
      start: toISODateString(s),
      end: toISODateString(addDays(parseISODateString(raw.end), 7)),
    };
  }, [rows, phases, milestones, todayIso]);

  const days = totalDays(span);
  const pct = (iso: string) => (dayIndex(iso, span.start) / days) * 100;
  const widthPct = (start: string, end: string) =>
    ((dayIndex(end, span.start) - dayIndex(start, span.start) + 1) / days) * 100;

  const hue = { category: project.category, hue: project.hue };
  const solid = projectSolidVar(hue);
  const fill = projectFillVar(hue);
  const progress = `color-mix(in oklch, ${solid} 45%, white)`;
  const markStyle: Record<MarkStatus, CSSProperties> = {
    open: { background: solid },
    done: { background: fill, border: `1.5px solid ${progress}` },
    today: { background: "var(--ink)" },
    overdue: { background: "var(--status-critical)" },
  };

  const updatePhase = useMutation(
    trpc.phases.update.mutationOptions({
      onSuccess: () => void queryClient.invalidateQueries(trpc.phases.listByProject.pathFilter()),
      onError: (e: { message: string }) => toast?.toast({ message: e.message, variant: "error" }),
    })
  );

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    const phaseId = e.dataTransfer.getData("application/x-kash-phase");
    if (!phaseId) return;
    e.preventDefault();
    const rect = axisRef.current?.getBoundingClientRect();
    if (!rect || e.clientX < rect.left) return;
    const offset = Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * days));
    const start = addDays(parseISODateString(span.start), offset);
    updatePhase.mutate({
      id: phaseId,
      startDate: toISODateString(start),
      endDate: toISODateString(addDays(start, DROPPED_PHASE_DAYS - 1)),
    });
  }

  // Size the grid box itself (not just its columns) so the absolute grid/today
  // overlay spans the whole chart when it scrolls.
  const gridWidth =
    zoom === "weeks" ? `max(100%, ${NAME_COL + days * PX_PER_DAY_WEEKS}px)` : "100%";
  const gridDates =
    zoom === "weeks" ? mondays(span.start, span.end) : monthStarts(span.start, span.end);
  // Label every month start, plus the month the chart opens in when that's mid-month.
  const months = [
    ...(parseISODateString(span.start).getDate() === 1 ? [] : [span.start]),
    ...monthStarts(span.start, span.end),
  ];
  const todayInSpan = todayIso >= span.start && todayIso <= span.end;

  const chartCell = (row: TimelineRow) => {
    if (row.kind === "phase") {
      if (!row.planned || !row.range.start || !row.range.end) return null;
      const ratio = row.total > 0 ? (row.done / row.total) * 100 : 0;
      const h = row.level === 0 ? 28 : 20;
      return (
        <div
          className="absolute top-1/2 rounded-pill"
          title={`${row.name}: ${row.range.start} – ${row.range.end}`}
          style={{
            left: `${pct(row.range.start)}%`,
            width: `${widthPct(row.range.start, row.range.end)}%`,
            height: h,
            marginTop: -h / 2,
            background: `linear-gradient(90deg, ${progress} ${ratio}%, ${fill} ${ratio}%)`,
          }}
        />
      );
    }
    if (row.kind === "task" && row.mark) {
      return (
        <div
          className="absolute top-1/2 -mt-1 h-2 min-w-2 rounded-pill"
          title={`${row.title}: ${row.mark.start === row.mark.end ? row.mark.start : `${row.mark.start} – ${row.mark.end}`}`}
          style={{
            left: `${pct(row.mark.start)}%`,
            width: `${widthPct(row.mark.start, row.mark.end)}%`,
            ...markStyle[row.mark.status],
          }}
        />
      );
    }
    return null;
  };

  const nameCell = (row: TimelineRow) => {
    if (row.kind === "section") {
      return (
        <span className="flex min-w-0 flex-col gap-1 pr-3">
          <span className="truncate text-micro font-semibold uppercase tracking-caps text-ink-muted">
            {row.label}
          </span>
          <span className="h-1 w-full overflow-hidden rounded-pill bg-menu-divider">
            <span
              className="block h-full rounded-pill"
              style={{
                width: `${row.total ? (row.done / row.total) * 100 : 0}%`,
                background: progress,
              }}
            />
          </span>
        </span>
      );
    }
    if (row.kind === "phase") {
      return (
        <button
          type="button"
          onClick={() => row.expandable && toggle(row.phaseId)}
          aria-expanded={row.expandable ? row.expanded : undefined}
          disabled={!row.expandable}
          className={cn(
            "kash-focus-row flex min-w-0 items-center gap-2 text-left outline-none disabled:cursor-default",
            row.level === 1 && "pl-[22px]"
          )}
        >
          <ChevronRight
            size={14}
            aria-hidden
            className={cn(
              "shrink-0 text-ink-muted transition-transform",
              row.expanded && "rotate-90",
              !row.expandable && "invisible"
            )}
          />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span
              className={cn(
                "truncate font-semibold text-ink",
                row.level === 0 ? "text-body" : "text-[14px]"
              )}
            >
              {row.name}
            </span>
            <span className="text-caption text-ink-muted">
              {row.planned ? `${row.done}/${row.total} done` : "Not planned"}
            </span>
          </span>
        </button>
      );
    }
    return (
      <span
        className={cn(
          "truncate pr-2 text-meta",
          row.level === 0 ? "pl-[44px]" : "pl-[66px]",
          row.done ? "text-ink-faint line-through" : "text-ink"
        )}
      >
        {row.title}
      </span>
    );
  };

  const rowHeight = (row: TimelineRow) =>
    row.kind === "section" ? 32 : row.kind === "task" ? 32 : row.level === 0 ? 48 : 40;

  const hasRows = rows.length > 0;
  // Open with today in view (a third of the way in) rather than at the chart's start.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const chart = el.scrollWidth - NAME_COL;
    const x = NAME_COL + (dayIndex(todayIso, span.start) / days) * chart;
    el.scrollLeft = Math.max(0, x - NAME_COL - (el.clientWidth - NAME_COL) / 3);
  }, [zoom, span.start, days, todayIso, hasRows]);

  const levelOptions = Array.from({ length: Math.max(0, depth - 1) }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1}–${i + 2}`,
  }));

  return (
    <div className="flex min-w-0 flex-1 gap-6">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="rounded-card bg-surface px-5 py-4">
          {rows.length === 0 ? (
            <p className="py-6 text-center text-body text-ink-muted">
              No phases yet — Edit adds the plan, then it shows here over time.
            </p>
          ) : (
            <>
              <div ref={scrollRef} className="overflow-x-auto">
                <div
                  className="relative grid"
                  style={{ gridTemplateColumns: `${NAME_COL}px minmax(0, 1fr)`, width: gridWidth }}
                  onDragOver={(e) => {
                    if (e.dataTransfer.types.includes("application/x-kash-phase"))
                      e.preventDefault();
                  }}
                  onDrop={onDrop}
                >
                  {/* axis */}
                  <div className="sticky left-0 z-[3] flex items-end gap-3 bg-surface pb-1 text-meta font-semibold">
                    <button
                      type="button"
                      onClick={() => setExpanded(new Set(phases.map((p) => p.id)))}
                      className="text-ink underline underline-offset-[3px] hover:decoration-2"
                    >
                      Expand all
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpanded(new Set())}
                      className="text-ink-muted underline underline-offset-[3px] hover:text-ink"
                    >
                      Collapse all
                    </button>
                  </div>
                  <div
                    ref={axisRef}
                    className="relative h-7 text-caption font-semibold text-ink-muted"
                    aria-hidden
                  >
                    {months.map((m) => (
                      <span key={m} className="absolute top-0" style={{ left: `${pct(m)}%` }}>
                        {parseISODateString(m).toLocaleDateString("en-US", { month: "short" })}
                      </span>
                    ))}
                    {milestones
                      .filter((m) => m.targetDate)
                      .map((m) => (
                        <span
                          key={m.id}
                          title={`${m.title} · ${m.targetDate}`}
                          className="absolute bottom-0.5 size-2 -translate-x-1/2 rotate-45 rounded-[1px]"
                          style={{
                            left: `${pct(m.targetDate!) + 100 / days / 2}%`,
                            background: m.completedAt ? progress : "var(--ink)",
                          }}
                        />
                      ))}
                  </div>

                  <div
                    className="pointer-events-none absolute bottom-0 top-7"
                    style={{ left: NAME_COL, right: 0 }}
                    aria-hidden
                  >
                    {gridDates.map((d) => (
                      <span
                        key={d}
                        className="absolute inset-y-0 w-px bg-canvas"
                        style={{ left: `${pct(d)}%` }}
                      />
                    ))}
                  </div>

                  {rows.map((row) => (
                    <div
                      key={row.key}
                      className={cn(
                        "contents",
                        row.kind === "phase" && !row.planned && "[&>*]:opacity-40"
                      )}
                    >
                      <div
                        className={cn(
                          "sticky left-0 z-[2] flex items-center bg-surface",
                          row.kind !== "task" && "border-t border-menu-divider"
                        )}
                        style={{ height: rowHeight(row) }}
                      >
                        {nameCell(row)}
                      </div>
                      <div
                        className={cn(
                          "relative flex items-center",
                          row.kind !== "task" && "border-t border-menu-divider"
                        )}
                        style={{ height: rowHeight(row) }}
                      >
                        {chartCell(row)}
                      </div>
                    </div>
                  ))}

                  {/* today, over the chart column only (the gridlines sit under the rows) */}
                  {todayInSpan ? (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute bottom-0 top-7 z-[1] w-0.5 rounded-pill bg-ink"
                      style={{
                        left: `calc(${NAME_COL}px + (100% - ${NAME_COL}px) * ${(pct(todayIso) + 100 / days / 2) / 100})`,
                      }}
                    />
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-3 text-caption text-ink-muted">
                {(
                  [
                    ["Open", markStyle.open],
                    ["Done", markStyle.done],
                    ["Due today", markStyle.today],
                    ["Overdue", markStyle.overdue],
                  ] as const
                ).map(([label, style]) => (
                  <span key={label} className="flex items-center gap-1.5">
                    <span className="h-2 w-[18px] rounded-pill" style={style} />
                    {label}
                  </span>
                ))}
                {milestones.some((m) => m.targetDate) ? (
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rotate-45 rounded-[1px] bg-ink" />
                    Milestone
                  </span>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>

      <ProjectRail
        sections={[
          {
            key: "zoom",
            label: "Zoom",
            icon: ZoomIn,
            content: (
              <InPageSwitcher
                options={ZOOM_OPTIONS}
                value={zoom}
                onChange={(z) => {
                  setZoom(z);
                  try {
                    window.localStorage.setItem(ZOOM_KEY, z);
                  } catch {
                    /* private mode */
                  }
                }}
                ariaLabel="Timeline zoom"
                fullWidth
              />
            ),
          },
          ...(levelOptions.length > 1
            ? [
                {
                  key: "levels",
                  label: "Levels shown",
                  icon: Layers,
                  content: (
                    <InPageSwitcher
                      options={levelOptions}
                      value={String(top)}
                      onChange={(v) => {
                        setWindowTop(Number(v));
                        setExpanded(new Set());
                      }}
                      ariaLabel="Phase levels shown"
                      fullWidth
                    />
                  ),
                },
              ]
            : []),
          {
            key: "unplanned",
            label: "Not planned",
            icon: CalendarRange,
            content:
              tray.length === 0 ? (
                <p className="text-meta text-ink-muted">Every phase here has dates.</p>
              ) : (
                <>
                  <ul className="flex flex-col gap-2">
                    {tray.map((p) => (
                      <li
                        key={p.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("application/x-kash-phase", p.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        className="flex h-10 cursor-grab items-center gap-2.5 rounded-pill border-[1.5px] border-dashed bg-surface px-3 text-[14px] font-semibold active:cursor-grabbing"
                        style={{ borderColor: progress, color: projectTextVar(hue) }}
                      >
                        <GripVertical size={14} className="shrink-0 text-ink-faint" aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{p.name}</span>
                        <span className="text-meta font-medium text-ink-muted">
                          {p.taskCount} {p.taskCount === 1 ? "task" : "tasks"}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-meta text-ink-muted">Drag onto the timeline to set dates</p>
                </>
              ),
          },
        ]}
      />
    </div>
  );
}

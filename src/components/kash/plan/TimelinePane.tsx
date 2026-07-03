"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { useLocalCalendarDate } from "@/hooks/useLocalCalendarDate";
import { toISODateString } from "@/lib/dates/local-day";
import type { ProjectCategory } from "@/lib/projects/categories";
import { categoryLabel } from "@/lib/projects/categories";
import { categorySolidVar } from "@/lib/projects/category-tokens";
import { DEFAULT_DAY_END_HOUR, DEFAULT_DAY_START_HOUR } from "@/lib/settings/constants";
import {
  computeTimelineRange,
  defaultViewportTopMin,
  TIMELINE_VIEWPORT_MINUTES,
} from "@/lib/timeline/adaptive-window";
import { layoutBlocks } from "@/lib/timeline/layout-blocks";
import { largestOpenGap, nextOpenSlotMin } from "@/lib/timeline/living-record";
import { useTRPC } from "@/trpc/client";

import ProtectedBlockChip, {
  type ProtectedBlockRow,
} from "@/components/kash/plan/week/ProtectedBlockChip";
import {
  dispatchSelfCareBreatheStart,
  dispatchSelfCareWalkStart,
} from "@/lib/nudges/self-care-session-events";
import { TOP3_HOLD_LABEL } from "@/lib/top3/constants";

import { SelfCareGapRow } from "./SelfCareGapRow";

const HOUR_HEIGHT = 56; // px per hour
const SLOT_MINUTES = 15;
/** Height of the visible scroll window — the six-hour default viewport. */
const VIEWPORT_HEIGHT = (TIMELINE_VIEWPORT_MINUTES / 60) * HOUR_HEIGHT;

type Block = {
  id: string;
  taskId: string;
  date: string;
  startMin: number;
  endMin: number;
  status: string;
  title: string;
  category: ProjectCategory | null;
  categoryUnresolved: boolean;
  isTop3: boolean;
};

/** The left-stripe colour for a block/marker: its category, or the accent when unresolved. */
function stripeColor(category: ProjectCategory | null, unresolved: boolean): string {
  return category && !unresolved ? categorySolidVar(category) : "var(--accent)";
}

function formatDuration(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function formatHour(hour24: number): string {
  const period = hour24 < 12 ? "a" : "p";
  const h = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${h}${period}`;
}

function formatClock(min: number): string {
  const h24 = Math.floor(min / 60);
  const m = min % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, "0")}`;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

/** A 15-minute drop target. A task or block dropped here lands at `min`. */
function TimelineSlot({ min, top }: { min: number; top: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: `timeline:${min}` });
  return (
    <div
      ref={setNodeRef}
      className={`absolute left-11 right-1 ${isOver ? "rounded bg-[var(--accent-soft)]" : ""}`}
      style={{ top, height: (SLOT_MINUTES / 60) * HOUR_HEIGHT }}
    />
  );
}

type BlockProps = {
  block: ReturnType<typeof layoutBlocks<Block>>[number];
  rangeStart: number;
  rangeEnd: number;
  nowMin: number | null;
  onResize: (id: string, startMin: number, endMin: number) => void;
  onRemove: (id: string) => void;
  onComplete: (id: string) => void;
  onOpen: (taskId: string, blockId: string) => void;
};

type TimedProtectedBlock = {
  id: string;
  category: ProjectCategory;
  label: string | null;
  startMin: number;
  endMin: number;
  status: "proposed" | "confirmed";
};

function toTimedProtected(
  b: ProtectedBlockRow & { scheduledDate?: string }
): TimedProtectedBlock | null {
  if (b.startMin == null || b.endMin == null) return null;
  return {
    id: b.id,
    category: b.category,
    label: b.label,
    startMin: b.startMin,
    endMin: b.endMin,
    status: b.status,
  };
}

function ProtectedTimelineBlock({
  block,
  layout,
  rangeStart,
  interactive = false,
  onConfirm,
  onDismiss,
  confirming = false,
}: {
  block: TimedProtectedBlock;
  layout: { col: number; cols: number };
  rangeStart: number;
  interactive?: boolean;
  onConfirm?: () => void;
  onDismiss?: () => void;
  confirming?: boolean;
}) {
  const title = block.label?.trim() || categoryLabel(block.category);
  const top = ((block.startMin - rangeStart) / 60) * HOUR_HEIGHT;
  const height = Math.max(18, ((block.endMin - block.startMin) / 60) * HOUR_HEIGHT);
  const gapPct = 1.5;
  const widthPct = 100 / layout.cols;
  const leftPct = layout.col * widthPct;
  const proposed = block.status === "proposed";

  return (
    <div
      className={`absolute flex flex-col overflow-hidden rounded-pill border border-l-[var(--stripe-width)] ${
        proposed
          ? "border-dashed border-[var(--border)] bg-[var(--surface-2)] opacity-90"
          : "border-[var(--border-subtle)] bg-[var(--surface-2)]"
      } ${interactive ? "z-sticky shadow-sm" : "pointer-events-none"}`}
      style={{
        top,
        height,
        left: `calc(2.75rem + ${leftPct}%)`,
        width: `calc(${widthPct}% - ${gapPct}rem)`,
        borderLeftColor: stripeColor(block.category, false),
      }}
      title={`Protected: ${title}`}
    >
      <div className="flex items-center gap-1 px-2 py-1">
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink-muted">
          <span aria-hidden className="mr-1">
            ⬚
          </span>
          {title}
        </span>
        <span className="shrink-0 text-caption tabular-nums text-ink-faint">
          {formatClock(block.startMin)}
        </span>
      </div>
      {interactive ? (
        <div className="flex items-center gap-1 border-t border-dashed border-[var(--border)] px-2 py-1">
          <button
            type="button"
            className="text-on-accent flex-1 rounded-pill bg-accent px-2 py-0.5 text-caption font-medium disabled:opacity-60"
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? "Holding…" : "Hold this time"}
          </button>
          <button
            type="button"
            className="rounded-pill px-2 py-0.5 text-caption text-ink-muted hover:text-ink"
            onClick={onDismiss}
            aria-label="Skip Top 3 time hold"
          >
            Skip
          </button>
        </div>
      ) : null}
    </div>
  );
}

type Top3HoldGhostProps = {
  slot: { startMin: number; endMin: number };
  rangeStart: number;
  onConfirm: () => void;
  onDismiss: () => void;
  confirming?: boolean;
};

function Top3HoldGhost({
  slot,
  rangeStart,
  onConfirm,
  onDismiss,
  confirming = false,
}: Top3HoldGhostProps) {
  return (
    <ProtectedTimelineBlock
      block={{
        id: "top3-hold-ghost",
        category: "professional",
        label: TOP3_HOLD_LABEL,
        startMin: slot.startMin,
        endMin: slot.endMin,
        status: "proposed",
      }}
      layout={{ col: 0, cols: 1 }}
      rangeStart={rangeStart}
      interactive
      onConfirm={onConfirm}
      onDismiss={onDismiss}
      confirming={confirming}
    />
  );
}

function TimelineBlock({
  block,
  rangeStart,
  rangeEnd,
  nowMin,
  onResize,
  onRemove,
  onComplete,
  onOpen,
}: BlockProps) {
  const done = block.status === "done";
  const active = !done && nowMin != null && nowMin >= block.startMin && nowMin < block.endMin;
  const durationMin = block.endMin - block.startMin;
  const elapsedMin = active && nowMin != null ? Math.max(0, nowMin - block.startMin) : 0;
  const [preview, setPreview] = useState<{ startMin: number; endMin: number } | null>(null);
  const [resize, setResize] = useState<{
    edge: "top" | "bottom";
    startY: number;
    startMin: number;
    endMin: number;
  } | null>(null);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `block:${block.id}`,
    disabled: done || resize !== null,
  });
  const { tabIndex, ...dragAttributes } = attributes;
  void tabIndex;

  const startMin = preview?.startMin ?? block.startMin;
  const endMin = preview?.endMin ?? block.endMin;
  const top = ((startMin - rangeStart) / 60) * HOUR_HEIGHT;
  const height = Math.max(18, ((endMin - startMin) / 60) * HOUR_HEIGHT);

  const gapPct = 1.5;
  const widthPct = 100 / block.cols;
  const leftPct = block.col * widthPct;

  const beginResize = (edge: "top" | "bottom") => (e: React.PointerEvent) => {
    if (done) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setResize({ edge, startY: e.clientY, startMin: block.startMin, endMin: block.endMin });
  };

  const moveResize = (e: React.PointerEvent) => {
    if (!resize) return;
    const deltaMin =
      Math.round((((e.clientY - resize.startY) / HOUR_HEIGHT) * 60) / SLOT_MINUTES) * SLOT_MINUTES;
    if (resize.edge === "top") {
      const next = clamp(resize.startMin + deltaMin, rangeStart, resize.endMin - SLOT_MINUTES);
      setPreview({ startMin: next, endMin: resize.endMin });
    } else {
      const next = clamp(resize.endMin + deltaMin, resize.startMin + SLOT_MINUTES, rangeEnd);
      setPreview({ startMin: resize.startMin, endMin: next });
    }
  };

  const endResize = () => {
    if (resize && preview) onResize(block.id, preview.startMin, preview.endMin);
    setResize(null);
    setPreview(null);
  };

  return (
    <div
      ref={setNodeRef}
      className={`absolute flex flex-col overflow-hidden rounded-pill border border-l-[var(--stripe-width)] bg-surface ${
        done ? "opacity-60" : ""
      } ${active ? "ring-1 ring-accent" : ""} ${isDragging ? "z-sticky opacity-80" : ""}`}
      style={{
        top,
        height,
        left: `calc(2.75rem + ${leftPct}%)`,
        width: `calc(${widthPct}% - ${gapPct}rem)`,
        borderLeftColor: stripeColor(block.category, block.categoryUnresolved),
        transform: CSS.Translate.toString(transform),
      }}
      onDoubleClick={() => (done ? undefined : onOpen(block.taskId, block.id))}
      {...dragAttributes}
      {...listeners}
    >
      {!done ? (
        <div
          className="absolute inset-x-0 top-0 h-1.5 cursor-ns-resize"
          onPointerDown={beginResize("top")}
          onPointerMove={moveResize}
          onPointerUp={endResize}
          aria-hidden
        />
      ) : null}

      <div className="flex items-center gap-1 px-2 py-1">
        {block.isTop3 ? (
          <span className="shrink-0 text-caption leading-none text-accent" title="Top 3">
            ★
          </span>
        ) : null}
        <span
          className={`min-w-0 flex-1 truncate text-xs font-medium text-ink ${
            done ? "line-through" : ""
          }`}
        >
          {block.title}
        </span>
        <span
          className={`shrink-0 text-caption tabular-nums ${
            active ? "font-medium text-accent" : "text-ink-muted"
          }`}
          title={done ? "Focused time" : active ? "Running" : "Starts"}
        >
          {done
            ? `✓ ${formatDuration(durationMin)}`
            : active
              ? formatDuration(elapsedMin)
              : formatClock(startMin)}
        </span>
        {!done ? (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onOpen(block.taskId, block.id);
            }}
            className="shrink-0 rounded-full px-1 text-xs leading-none text-ink-muted hover:text-accent"
            aria-label={`Start ${block.title}`}
            title="Start (focus)"
          >
            ▶
          </button>
        ) : null}
        {!done ? (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onComplete(block.id);
            }}
            className="shrink-0 rounded-full px-1 text-xs leading-none text-ink-muted hover:text-accent"
            aria-label={`Mark ${block.title} done`}
            title="Mark done"
          >
            ✓
          </button>
        ) : null}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(block.id);
          }}
          className="shrink-0 rounded-full px-1 text-xs leading-none text-ink-muted hover:text-ink"
          aria-label={`Remove block ${block.title}`}
        >
          ×
        </button>
      </div>

      {!done ? (
        <div
          className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize"
          onPointerDown={beginResize("bottom")}
          onPointerMove={moveResize}
          onPointerUp={endResize}
          aria-hidden
        />
      ) : null}
    </div>
  );
}

/**
 * Day timeline. Renders an hour grid (driven by the user's working hours) with a
 * live "now" line and the day's focus blocks. Tasks dragged from the list create
 * blocks (handled in DayPlanCanvas); blocks here can be moved, resized, started
 * (▶ / double-click → focus), marked done (✓), and removed (×).
 */
type Top3HoldOffer = {
  slot: { startMin: number; endMin: number };
  show: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
  confirming?: boolean;
};

type TimelinePaneProps = {
  top3HoldOffer?: Top3HoldOffer | null;
  /** D14/V3: hide decide slot, gap rows, and sync badge until the day has tasks or blocks. */
  planItemCount?: number;
};

export function TimelinePane({ top3HoldOffer = null, planItemCount = 0 }: TimelinePaneProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const date = useLocalCalendarDate();
  const [now, setNow] = useState<Date | null>(null);
  const gapDismissKey = `selfCareGapDismiss:${date}`;
  const [gapDismissed, setGapDismissed] = useState(false);

  useEffect(() => {
    setGapDismissed(localStorage.getItem(gapDismissKey) === "1");
  }, [gapDismissKey]);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const { data: settings } = useQuery(trpc.settings.get.queryOptions());
  const dayStartHour = settings?.dayStartHour ?? DEFAULT_DAY_START_HOUR;
  const dayEndHour = settings?.dayEndHour ?? DEFAULT_DAY_END_HOUR;

  const { data: blocks = [] } = useQuery(trpc.focusBlocks.listForDate.queryOptions({ date }));
  const { data: protectedBlocks = [] } = useQuery(
    trpc.protectedBlocks.listForDate.queryOptions({ date })
  );
  const { data: recentlyCompleted = [] } = useQuery(
    trpc.tasks.listRecentlyCompleted.queryOptions()
  );

  const nowMinutes = now ? now.getHours() * 60 + now.getMinutes() : null;

  // The rendered day grows to cover working hours, every block, and now; the
  // viewport defaults to six hours around now but the rest scrolls into view.
  const timedProtected = protectedBlocks
    .map(toTimedProtected)
    .filter((b): b is TimedProtectedBlock => b != null);

  const range = computeTimelineRange({
    dayStartMin: dayStartHour * 60,
    dayEndMin: dayEndHour * 60,
    blocks: [
      ...(blocks as Block[]),
      ...timedProtected.map((b) => ({ startMin: b.startMin, endMin: b.endMin })),
    ],
    nowMin: nowMinutes,
  });
  const rangeStart = range.startMin;
  const rangeEnd = range.endMin;
  const startHour = Math.floor(rangeStart / 60);
  const endHour = Math.ceil(rangeEnd / 60);
  const hours = Array.from({ length: Math.max(1, endHour - startHour) }, (_, i) => startHour + i);
  const slots = Array.from(
    { length: Math.max(0, (rangeEnd - rangeStart) / SLOT_MINUTES) },
    (_, i) => rangeStart + i * SLOT_MINUTES
  );

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const userScrolledRef = useRef(false);
  const programmaticRef = useRef(false);
  const [nowOffscreen, setNowOffscreen] = useState(false);

  const nowTopPx = nowMinutes != null ? ((nowMinutes - rangeStart) / 60) * HOUR_HEIGHT : null;

  const scrollToNow = useCallback(() => {
    const el = scrollRef.current;
    if (!el || nowMinutes == null) return;
    const targetMin = defaultViewportTopMin({ startMin: rangeStart, endMin: rangeEnd }, nowMinutes);
    const top = ((targetMin - rangeStart) / 60) * HOUR_HEIGHT;
    if (Math.abs(el.scrollTop - top) > 1) {
      programmaticRef.current = true;
      el.scrollTop = top;
    }
    setNowOffscreen(false);
  }, [nowMinutes, rangeStart, rangeEnd]);

  // Park the viewport on "now" when the day opens, and keep it there until the
  // user scrolls for themselves.
  useEffect(() => {
    if (!userScrolledRef.current) scrollToNow();
  }, [scrollToNow]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (programmaticRef.current) {
      programmaticRef.current = false;
    } else {
      userScrolledRef.current = true;
    }
    if (nowTopPx == null) {
      setNowOffscreen(false);
      return;
    }
    const visible = nowTopPx >= el.scrollTop && nowTopPx <= el.scrollTop + el.clientHeight;
    setNowOffscreen(!visible);
  }, [nowTopPx]);

  const allDayProtected = protectedBlocks.filter((b) => b.startMin == null);

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: trpc.focusBlocks.listForDate.queryKey({ date }),
    });
    void queryClient.invalidateQueries({
      queryKey: trpc.protectedBlocks.listForDate.queryKey({ date }),
    });
  };

  const removeMutation = useMutation(
    trpc.focusBlocks.remove.mutationOptions({ onSuccess: invalidate })
  );
  const completeMutation = useMutation(
    trpc.focusBlocks.complete.mutationOptions({ onSuccess: invalidate })
  );
  const resizeMutation = useMutation(
    trpc.focusBlocks.resize.mutationOptions({ onSuccess: invalidate })
  );

  const removeProtectedMutation = useMutation(
    trpc.protectedBlocks.remove.mutationOptions({ onSuccess: invalidate })
  );

  type TimedGridItem = ({ kind: "focus" } & Block) | ({ kind: "protected" } & TimedProtectedBlock);

  const gridItems: TimedGridItem[] = [
    ...(blocks as Block[]).map((b) => ({ kind: "focus" as const, ...b })),
    ...timedProtected.map((b) => ({ kind: "protected" as const, ...b })),
  ];

  const laidOutGrid = layoutBlocks(gridItems).filter(
    (b) => b.endMin > rangeStart && b.startMin < rangeEnd
  );

  // Untimed completions: tasks checked off today that never got a focus block —
  // shown as thin ticks at their completion time, so an errand-heavy day still
  // reads as a full record rather than an empty calendar (Today §6 Thread 2).
  const blockedTaskIds = new Set(blocks.map((b) => b.taskId));
  const untimedCompletions = recentlyCompleted
    .filter((t) => t.completedAt != null && !blockedTaskIds.has(t.id))
    .map((t) => {
      const at = new Date(t.completedAt as Date);
      return { ...t, localDate: toISODateString(at), min: at.getHours() * 60 + at.getMinutes() };
    })
    .filter((t) => t.localDate === date && t.min >= rangeStart && t.min <= rangeEnd);

  // The open "Decide" slot and a single self-care suggestion fill the day's
  // remaining room without overlapping each other (design-prompt-today).
  const busy = [
    ...blocks.map((b) => ({ startMin: b.startMin, endMin: b.endMin })),
    ...timedProtected.map((b) => ({ startMin: b.startMin, endMin: b.endMin })),
  ];
  const NEXT_BLOCK_MIN = 45;
  const decideSlotMin =
    nowMinutes != null ? nextOpenSlotMin(busy, nowMinutes, rangeEnd, NEXT_BLOCK_MIN) : null;
  const selfCareBusy =
    decideSlotMin != null
      ? [...busy, { startMin: decideSlotMin, endMin: decideSlotMin + NEXT_BLOCK_MIN }]
      : busy;
  const selfCareGap =
    nowMinutes != null ? largestOpenGap(selfCareBusy, nowMinutes, rangeEnd, 60) : null;

  const showNowLine = nowMinutes != null && nowMinutes >= rangeStart && nowMinutes <= rangeEnd;
  const showTimelineChrome =
    planItemCount > 0 ||
    blocks.length > 0 ||
    timedProtected.length > 0 ||
    allDayProtected.length > 0;

  const openFocus = (taskId: string, blockId: string) => {
    router.push(`/today/focus?${new URLSearchParams({ taskId, blockId }).toString()}`);
  };

  return (
    <section
      className="flex flex-col rounded-card border border-subtle bg-surface p-4"
      aria-label="Today timeline"
    >
      <header className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-ink-muted">Timeline</h2>
        <span className="text-xs text-ink-muted">
          · today · {formatHour(startHour)}–{formatHour(endHour)}
        </span>
        {showTimelineChrome ? (
          <span
            className="ml-auto rounded-pill border border-border bg-surface px-2 py-0.5 text-xs text-ink-muted"
            title="Calendar sync is coming in a later phase"
          >
            sync ○ off
          </span>
        ) : null}
      </header>

      {allDayProtected.length > 0 ? (
        <ul className="mb-3 space-y-1.5" aria-label="Protected time today">
          {allDayProtected.map((block) => (
            <ProtectedBlockChip
              key={block.id}
              block={block}
              onRemove={(id) => removeProtectedMutation.mutate({ id })}
            />
          ))}
        </ul>
      ) : null}

      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="relative overflow-y-auto overflow-x-hidden pt-2"
          style={{ height: VIEWPORT_HEIGHT }}
        >
          <div className="relative" style={{ height: hours.length * HOUR_HEIGHT }}>
            {hours.map((hour, i) => (
              <div
                key={hour}
                className="absolute inset-x-0 flex items-start"
                style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
              >
                <span className="w-9 shrink-0 -translate-y-2 text-right text-caption tabular-nums text-ink-muted">
                  {formatHour(hour)}
                </span>
                <div className="ml-2 flex-1 border-t border-dashed border-[var(--border)]" />
              </div>
            ))}

            {slots.map((min) => (
              <TimelineSlot key={min} min={min} top={((min - rangeStart) / 60) * HOUR_HEIGHT} />
            ))}

            {laidOutGrid.map((item) =>
              item.kind === "protected" ? (
                <ProtectedTimelineBlock
                  key={`protected-${item.id}`}
                  block={item}
                  layout={{ col: item.col, cols: item.cols }}
                  rangeStart={rangeStart}
                />
              ) : (
                <TimelineBlock
                  key={item.id}
                  block={item}
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                  nowMin={nowMinutes}
                  onResize={(id, startMin, endMin) =>
                    resizeMutation.mutate({ id, startMin, endMin })
                  }
                  onRemove={(id) => removeMutation.mutate({ id })}
                  onComplete={(id) => completeMutation.mutate({ id })}
                  onOpen={openFocus}
                />
              )
            )}

            {top3HoldOffer?.show && top3HoldOffer.slot ? (
              <Top3HoldGhost
                slot={top3HoldOffer.slot}
                rangeStart={rangeStart}
                onConfirm={top3HoldOffer.onConfirm}
                onDismiss={top3HoldOffer.onDismiss}
                confirming={top3HoldOffer.confirming}
              />
            ) : null}

            {untimedCompletions.map((t) => (
              <div
                key={`done-${t.id}`}
                className="pointer-events-none absolute left-11 right-1 flex items-center gap-1.5"
                style={{ top: ((t.min - rangeStart) / 60) * HOUR_HEIGHT }}
                title={`Completed ${formatClock(t.min)}`}
              >
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: stripeColor(t.category, t.categoryUnresolved) }}
                />
                <span className="min-w-0 flex-1 truncate text-caption text-ink-muted line-through">
                  {t.title}
                </span>
                <span className="shrink-0 text-caption text-ink-faint">✓</span>
              </div>
            ))}

            {showTimelineChrome && selfCareGap && !gapDismissed ? (
              <SelfCareGapRow
                top={((selfCareGap.startMin - rangeStart) / 60) * HOUR_HEIGHT + 4}
                onStartWalk={dispatchSelfCareWalkStart}
                onStartBreathe={dispatchSelfCareBreatheStart}
                onDismiss={() => {
                  localStorage.setItem(gapDismissKey, "1");
                  setGapDismissed(true);
                }}
              />
            ) : null}

            {showTimelineChrome && decideSlotMin != null ? (
              <div
                className="pointer-events-none absolute left-11 right-1 flex items-center justify-center gap-1.5 rounded-md border border-dashed border-[var(--border)] text-caption text-ink-faint"
                style={{
                  top: ((decideSlotMin - rangeStart) / 60) * HOUR_HEIGHT,
                  height: (NEXT_BLOCK_MIN / 60) * HOUR_HEIGHT - 4,
                }}
              >
                <span>Decide</span>
                <kbd className="rounded border border-border bg-surface-2 px-1 py-0.5 font-sans text-caption">
                  ⌘D
                </kbd>
                <span>drops the next block here</span>
              </div>
            ) : null}

            {showNowLine ? (
              <div
                className="pointer-events-none absolute inset-x-0 z-sticky flex items-center"
                style={{ top: ((nowMinutes! - rangeStart) / 60) * HOUR_HEIGHT }}
                aria-hidden
              >
                <span className="w-9 shrink-0 -translate-y-2 text-right text-caption font-medium text-accent">
                  now
                </span>
                <div className="ml-2 flex-1 border-t border-accent" />
                <span className="ml-1 shrink-0 -translate-y-2 text-caption font-medium tabular-nums text-accent">
                  {formatClock(nowMinutes!)}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {nowOffscreen ? (
          <button
            type="button"
            onClick={scrollToNow}
            className="absolute bottom-2 right-2 z-sticky rounded-pill border bg-surface px-2 py-0.5 text-caption font-medium text-accent shadow-sm"
          >
            {nowTopPx != null && scrollRef.current && nowTopPx < scrollRef.current.scrollTop
              ? "↑"
              : "↓"}{" "}
            jump to now
          </button>
        ) : null}
      </div>

      {blocks.length === 0 ? (
        <p className="mt-3 text-center text-xs text-ink-muted">Drag a task here to block 45 min.</p>
      ) : null}
    </section>
  );
}

"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useLocalCalendarDate } from "@/hooks/useLocalCalendarDate";
import { DEFAULT_DAY_END_HOUR, DEFAULT_DAY_START_HOUR } from "@/lib/settings/constants";
import { layoutBlocks } from "@/lib/timeline/layout-blocks";
import { useTRPC } from "@/trpc/client";

const HOUR_HEIGHT = 56; // px per hour
const SLOT_MINUTES = 15;

type Block = {
  id: string;
  taskId: string;
  date: string;
  startMin: number;
  endMin: number;
  status: string;
  title: string;
};

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
      className={`absolute left-11 right-1 ${isOver ? "rounded bg-[var(--kash-accent-soft)]" : ""}`}
      style={{ top, height: (SLOT_MINUTES / 60) * HOUR_HEIGHT }}
    />
  );
}

type BlockProps = {
  block: ReturnType<typeof layoutBlocks<Block>>[number];
  rangeStart: number;
  rangeEnd: number;
  onResize: (id: string, startMin: number, endMin: number) => void;
  onRemove: (id: string) => void;
  onComplete: (id: string) => void;
  onOpen: (taskId: string, blockId: string) => void;
};

function TimelineBlock({
  block,
  rangeStart,
  rangeEnd,
  onResize,
  onRemove,
  onComplete,
  onOpen,
}: BlockProps) {
  const done = block.status === "done";
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
      className={`glass-pill absolute flex flex-col overflow-hidden border-l-[3px] border-kash-accent ${
        done ? "opacity-50" : ""
      } ${isDragging ? "z-20 opacity-80" : ""}`}
      style={{
        top,
        height,
        left: `calc(2.75rem + ${leftPct}%)`,
        width: `calc(${widthPct}% - ${gapPct}rem)`,
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
        <span
          className={`min-w-0 flex-1 truncate text-xs font-medium text-kash-ink ${
            done ? "line-through" : ""
          }`}
        >
          {block.title}
        </span>
        <span className="shrink-0 text-[10px] text-kash-ink-muted">{formatClock(startMin)}</span>
        {!done ? (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onOpen(block.taskId, block.id);
            }}
            className="shrink-0 rounded-full px-1 text-xs leading-none text-kash-ink-muted hover:text-kash-accent"
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
            className="shrink-0 rounded-full px-1 text-xs leading-none text-kash-ink-muted hover:text-kash-accent"
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
          className="shrink-0 rounded-full px-1 text-xs leading-none text-kash-ink-muted hover:text-kash-ink"
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
export function TimelinePane() {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const date = useLocalCalendarDate();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const { data: settings } = useQuery(trpc.settings.get.queryOptions());
  const startHour = settings?.dayStartHour ?? DEFAULT_DAY_START_HOUR;
  const endHour = settings?.dayEndHour ?? DEFAULT_DAY_END_HOUR;
  const rangeStart = startHour * 60;
  const rangeEnd = endHour * 60;
  const hours = Array.from({ length: Math.max(1, endHour - startHour) }, (_, i) => startHour + i);
  const slots = Array.from(
    { length: Math.max(0, (rangeEnd - rangeStart) / SLOT_MINUTES) },
    (_, i) => rangeStart + i * SLOT_MINUTES
  );

  const { data: blocks = [] } = useQuery(trpc.focusBlocks.listForDate.queryOptions({ date }));

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: trpc.focusBlocks.listForDate.queryKey({ date }),
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

  const laidOut = layoutBlocks(blocks as Block[]).filter(
    (b) => b.endMin > rangeStart && b.startMin < rangeEnd
  );

  const nowMinutes = now ? now.getHours() * 60 + now.getMinutes() : null;
  const showNowLine = nowMinutes != null && nowMinutes >= rangeStart && nowMinutes <= rangeEnd;

  const openFocus = (taskId: string, blockId: string) => {
    router.push(`/today/focus?${new URLSearchParams({ taskId, blockId }).toString()}`);
  };

  return (
    <section className="glass-panel-opaque flex flex-col p-4" aria-label="Today timeline">
      <header className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-kash-ink-muted">
          Timeline
        </h2>
        <span className="text-xs text-kash-ink-muted">
          · today · {formatHour(startHour)}–{formatHour(endHour)}
        </span>
        <span
          className="glass-pill ml-auto px-2 py-0.5 text-xs text-kash-ink-muted"
          title="Calendar sync is coming in a later phase"
        >
          sync ○ off
        </span>
      </header>

      <div className="relative" style={{ height: hours.length * HOUR_HEIGHT }}>
        {hours.map((hour, i) => (
          <div
            key={hour}
            className="absolute inset-x-0 flex items-start"
            style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
          >
            <span className="w-9 shrink-0 -translate-y-2 text-right text-[11px] tabular-nums text-kash-ink-muted">
              {formatHour(hour)}
            </span>
            <div className="ml-2 flex-1 border-t border-dashed border-[var(--kash-glass-border)]" />
          </div>
        ))}

        {slots.map((min) => (
          <TimelineSlot key={min} min={min} top={((min - rangeStart) / 60) * HOUR_HEIGHT} />
        ))}

        {laidOut.map((block) => (
          <TimelineBlock
            key={block.id}
            block={block}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onResize={(id, startMin, endMin) => resizeMutation.mutate({ id, startMin, endMin })}
            onRemove={(id) => removeMutation.mutate({ id })}
            onComplete={(id) => completeMutation.mutate({ id })}
            onOpen={openFocus}
          />
        ))}

        {showNowLine ? (
          <div
            className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
            style={{ top: ((nowMinutes! - rangeStart) / 60) * HOUR_HEIGHT }}
            aria-hidden
          >
            <span className="w-9 shrink-0 -translate-y-2 text-right text-[11px] font-medium text-kash-accent">
              now
            </span>
            <div className="ml-2 flex-1 border-t border-kash-accent" />
          </div>
        ) : null}
      </div>

      {blocks.length === 0 ? (
        <p className="mt-3 text-center text-xs text-kash-ink-muted">
          Drag a task here to block 45 min.
        </p>
      ) : null}
    </section>
  );
}

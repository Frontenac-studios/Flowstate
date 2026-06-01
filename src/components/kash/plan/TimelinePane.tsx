"use client";

import { useDroppable } from "@dnd-kit/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useLocalCalendarDate } from "@/hooks/useLocalCalendarDate";
import { useTRPC } from "@/trpc/client";

const START_HOUR = 7; // 7am
const END_HOUR = 19; // 7pm
const HOUR_HEIGHT = 56; // px per hour
const SLOT_MINUTES = 15;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const RANGE_START = START_HOUR * 60;
const RANGE_END = END_HOUR * 60;
const SLOTS = Array.from(
  { length: (RANGE_END - RANGE_START) / SLOT_MINUTES },
  (_, i) => RANGE_START + i * SLOT_MINUTES
);

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

function topFor(min: number): number {
  return ((min - RANGE_START) / 60) * HOUR_HEIGHT;
}

/** A 15-minute drop target. A task dropped here becomes a focus block at `min`. */
function TimelineSlot({ min }: { min: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: `timeline:${min}` });
  return (
    <div
      ref={setNodeRef}
      className={`absolute left-11 right-1 ${isOver ? "rounded bg-[var(--kash-accent-soft)]" : ""}`}
      style={{ top: topFor(min), height: (SLOT_MINUTES / 60) * HOUR_HEIGHT }}
    />
  );
}

/**
 * Day timeline. Renders a 7a–7p hour grid with a live "now" line and the day's
 * focus blocks. Dragging a task onto a slot creates a 45-minute block (handled in
 * DayPlanCanvas's drag context); blocks can be removed here.
 */
export function TimelinePane() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const date = useLocalCalendarDate();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const { data: blocks = [] } = useQuery(trpc.focusBlocks.listForDate.queryOptions({ date }));

  const removeMutation = useMutation(
    trpc.focusBlocks.remove.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.focusBlocks.listForDate.queryKey({ date }),
        });
      },
    })
  );

  const nowMinutes = now ? now.getHours() * 60 + now.getMinutes() : null;
  const showNowLine = nowMinutes != null && nowMinutes >= RANGE_START && nowMinutes <= RANGE_END;

  return (
    <section className="glass-panel-opaque flex flex-col p-4" aria-label="Today timeline">
      <header className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-kash-ink-muted">
          Timeline
        </h2>
        <span className="text-xs text-kash-ink-muted">· today · 7a–7p</span>
        <span
          className="glass-pill ml-auto px-2 py-0.5 text-xs text-kash-ink-muted"
          title="Calendar sync is coming in a later phase"
        >
          sync ○ off
        </span>
      </header>

      <div className="relative" style={{ height: HOURS.length * HOUR_HEIGHT }}>
        {HOURS.map((hour, i) => (
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

        {SLOTS.map((min) => (
          <TimelineSlot key={min} min={min} />
        ))}

        {blocks.map((block) => {
          const top = topFor(block.startMin);
          const height = Math.max(18, ((block.endMin - block.startMin) / 60) * HOUR_HEIGHT);
          return (
            <div
              key={block.id}
              className="glass-pill absolute left-11 right-1 flex items-center gap-1 overflow-hidden border-l-[3px] border-kash-accent px-2 py-1"
              style={{ top, height }}
            >
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-kash-ink">
                {block.title}
              </span>
              <span className="shrink-0 text-[10px] text-kash-ink-muted">
                {formatClock(block.startMin)}
              </span>
              <button
                type="button"
                onClick={() => removeMutation.mutate({ id: block.id })}
                className="shrink-0 rounded-full px-1 text-xs leading-none text-kash-ink-muted hover:text-kash-ink"
                aria-label={`Remove block ${block.title}`}
              >
                ×
              </button>
            </div>
          );
        })}

        {showNowLine ? (
          <div
            className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
            style={{ top: topFor(nowMinutes!) }}
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

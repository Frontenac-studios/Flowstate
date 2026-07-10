"use client";

import type { EventForDay } from "@/trpc/routers/calendar";

export type ExternalEventBlockProps = {
  event: Pick<
    EventForDay,
    "id" | "title" | "startMin" | "endMin" | "status" | "visibility" | "htmlLink" | "calendarName"
  >;
  layout: { col: number; cols: number };
  rangeStart: number;
};

function formatClock(min: number): string {
  const h24 = Math.floor(min / 60);
  const m = min % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, "0")}`;
}

function displayTitle(event: { title: string | null }): string {
  return event.title?.trim() || "Busy";
}

/** Read-only inbound calendar event on the Today timeline (D11 neutral styling). */
export function ExternalEventBlock({ event, layout, rangeStart }: ExternalEventBlockProps) {
  const title = displayTitle(event);
  const top = ((event.startMin - rangeStart) / 60) * 56;
  const height = Math.max(18, ((event.endMin - event.startMin) / 60) * 56);
  const gapPct = 1.5;
  const widthPct = 100 / layout.cols;
  const leftPct = layout.col * widthPct;
  const tentative = event.status === "tentative";

  return (
    <div
      className={`pointer-events-none absolute flex flex-col overflow-hidden rounded-pill border border-[var(--border-subtle)] border-l-[var(--stripe-width)] bg-[var(--surface-2)] ${
        tentative ? "opacity-75" : ""
      }`}
      style={{
        top,
        height,
        left: `calc(2.75rem + ${leftPct}%)`,
        width: `calc(${widthPct}% - ${gapPct}rem)`,
        borderLeftColor: "var(--ink-faint)",
      }}
      title={
        event.calendarName
          ? `${title} · ${event.calendarName}${event.visibility === "private" ? " (private)" : ""}`
          : title
      }
    >
      <div className="flex items-center gap-1 px-2 py-1">
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink-muted">
          {title}
          <span className="text-ink-faint"> cal</span>
        </span>
        <span className="shrink-0 text-caption tabular-nums text-ink-faint">
          {formatClock(event.startMin)}
        </span>
      </div>
    </div>
  );
}

type AllDayChipProps = {
  event: Pick<EventForDay, "id" | "title" | "visibility" | "calendarName" | "status">;
};

/** All-day external event chip above the timeline grid. */
export function ExternalEventAllDayChip({ event }: AllDayChipProps) {
  const title = displayTitle(event);
  const tentative = event.status === "tentative";

  return (
    <li
      className={`flex items-start gap-2 rounded-row border border-[var(--border-subtle)] bg-[var(--surface-2)] px-2 py-1.5 text-xs ${
        tentative ? "opacity-75" : ""
      }`}
    >
      <span
        className="mt-0.5 w-[var(--stripe-width)] shrink-0 self-stretch rounded-full bg-[var(--ink-faint)]"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink-muted">
          {title}
          <span className="text-ink-faint"> cal</span>
        </p>
        <p className="text-caption text-ink-faint">
          All day
          {event.calendarName ? ` · ${event.calendarName}` : ""}
        </p>
      </div>
    </li>
  );
}

function formatTimeRange(startMin: number, endMin: number): string {
  const fmt = (min: number) => {
    const h24 = Math.floor(min / 60);
    const m = min % 60;
    const h = h24 % 12 === 0 ? 12 : h24 % 12;
    const period = h24 < 12 ? "a" : "p";
    return m === 0 ? `${h}${period}` : `${h}:${String(m).padStart(2, "0")}${period}`;
  };
  return `${fmt(startMin)}–${fmt(endMin)}`;
}

type WeekChipProps = {
  event: Pick<
    EventForDay,
    "id" | "title" | "startMin" | "endMin" | "isAllDay" | "status" | "visibility" | "calendarName"
  >;
};

/** Compact external event chip for week day columns. */
export function ExternalEventWeekChip({ event }: WeekChipProps) {
  const title = displayTitle(event);
  const tentative = event.status === "tentative";

  return (
    <li
      className={`flex items-start gap-2 rounded-row border border-[var(--border-subtle)] bg-[var(--surface-2)] px-2 py-1 text-xs ${
        tentative ? "opacity-75" : ""
      }`}
    >
      <span
        className="mt-0.5 w-[var(--stripe-width)] shrink-0 self-stretch rounded-full bg-[var(--ink-faint)]"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink-muted">
          {title}
          <span className="text-ink-faint"> cal</span>
        </p>
        <p className="text-caption text-ink-faint">
          {event.isAllDay ? "All day" : formatTimeRange(event.startMin, event.endMin)}
          {event.calendarName ? ` · ${event.calendarName}` : ""}
        </p>
      </div>
    </li>
  );
}

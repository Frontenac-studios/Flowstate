"use client";

import type { EventForDay } from "@/trpc/routers/calendar";
import { calendarEventColors } from "@/lib/calendar/event-color";
import { timelineBlockStyle } from "@/lib/timeline/block-geometry";
import { TIMELINE_HOUR_HEIGHT } from "@/lib/timeline/adaptive-window";

export type ExternalEventBlockProps = {
  event: Pick<
    EventForDay,
    | "id"
    | "title"
    | "startMin"
    | "endMin"
    | "status"
    | "visibility"
    | "htmlLink"
    | "calendarName"
    | "calendarColor"
  >;
  layout: { col: number; cols: number };
  rangeStart: number;
};

function displayTitle(event: { title: string | null }): string {
  return event.title?.trim() || "Busy";
}

/**
 * Read-only inbound calendar event on the Today timeline. Spec v4/v5: external events
 * are white with a hairline outline and muted 12/600 text, so they read as "not
 * mine" next to the project-tinted task blocks.
 */
export function ExternalEventBlock({ event, layout, rangeStart }: ExternalEventBlockProps) {
  const title = displayTitle(event);
  const top = ((event.startMin - rangeStart) / 60) * TIMELINE_HOUR_HEIGHT;
  const height = Math.max(18, ((event.endMin - event.startMin) / 60) * TIMELINE_HOUR_HEIGHT);
  const geometry = timelineBlockStyle(layout, top, height);
  const tentative = event.status === "tentative";

  return (
    <div
      className={`pointer-events-none absolute flex flex-col overflow-hidden rounded-row border border-outline-border bg-surface text-ink-muted ${
        tentative ? "opacity-75" : ""
      }`}
      style={geometry}
      title={
        event.calendarName
          ? `${title} · ${event.calendarName}${event.visibility === "private" ? " (private)" : ""}`
          : title
      }
    >
      <div className="flex items-center gap-1 px-2.5 py-0.5">
        <span className="min-w-0 flex-1 truncate text-caption font-semibold">{title}</span>
        <span className="shrink-0 text-caption tabular-nums">
          {formatTimeRange(event.startMin, event.endMin)}
        </span>
      </div>
    </div>
  );
}

type AllDayChipProps = {
  event: Pick<
    EventForDay,
    "id" | "title" | "visibility" | "calendarName" | "status" | "calendarColor"
  >;
};

/** All-day external event chip above the timeline grid. */
export function ExternalEventAllDayChip({ event }: AllDayChipProps) {
  const title = displayTitle(event);
  const tentative = event.status === "tentative";
  const colors = calendarEventColors(event.calendarColor);

  return (
    <li
      className={`flex items-start gap-2 rounded-row border border-[var(--border-subtle)] px-2 py-1.5 text-xs ${
        tentative ? "opacity-75" : ""
      }`}
      style={{ backgroundColor: colors.fill }}
    >
      <span
        className="mt-0.5 w-[var(--stripe-width)] shrink-0 self-stretch rounded-full"
        style={{ backgroundColor: colors.stripe }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink">
          {title}
          <span className="text-ink-muted"> cal</span>
        </p>
        <p className="text-caption text-ink-muted">
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
    | "id"
    | "title"
    | "startMin"
    | "endMin"
    | "isAllDay"
    | "status"
    | "visibility"
    | "calendarName"
    | "calendarColor"
  >;
};

/** Compact external event chip for week day columns. */
export function ExternalEventWeekChip({ event }: WeekChipProps) {
  const title = displayTitle(event);
  const tentative = event.status === "tentative";
  const colors = calendarEventColors(event.calendarColor);

  return (
    <li
      className={`flex items-start gap-2 rounded-row border border-[var(--border-subtle)] px-2 py-1 text-xs ${
        tentative ? "opacity-75" : ""
      }`}
      style={{ backgroundColor: colors.fill }}
    >
      <span
        className="mt-0.5 w-[var(--stripe-width)] shrink-0 self-stretch rounded-full"
        style={{ backgroundColor: colors.stripe }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">
          {title}
          <span className="text-ink-muted"> cal</span>
        </p>
        <p className="text-caption text-ink-muted">
          {event.isAllDay ? "All day" : formatTimeRange(event.startMin, event.endMin)}
          {event.calendarName ? ` · ${event.calendarName}` : ""}
        </p>
      </div>
    </li>
  );
}

"use client";

import { useEffect, useState } from "react";

const START_HOUR = 7; // 7am
const END_HOUR = 19; // 7pm
const HOUR_HEIGHT = 56; // px per hour
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

function formatHour(hour24: number): string {
  const period = hour24 < 12 ? "a" : "p";
  const h = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${h}${period}`;
}

/**
 * Day timeline (visual only for now). Renders a 7a–7pm hour grid with a live
 * "now" line. Focus blocks and calendar-synced events get wired up in later
 * phases — this establishes the layout and the drop surface.
 */
export function TimelinePane() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const nowMinutes = now ? now.getHours() * 60 + now.getMinutes() : null;
  const rangeStart = START_HOUR * 60;
  const rangeEnd = END_HOUR * 60;
  const showNowLine = nowMinutes != null && nowMinutes >= rangeStart && nowMinutes <= rangeEnd;
  const nowTop = nowMinutes != null ? ((nowMinutes - rangeStart) / 60) * HOUR_HEIGHT : 0;

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

        {showNowLine ? (
          <div
            className="pointer-events-none absolute inset-x-0 flex items-center"
            style={{ top: nowTop }}
            aria-hidden
          >
            <span className="w-9 shrink-0 -translate-y-2 text-right text-[11px] font-medium text-kash-accent">
              now
            </span>
            <div className="ml-2 flex-1 border-t border-kash-accent" />
          </div>
        ) : null}
      </div>

      <p className="mt-3 text-center text-xs text-kash-ink-muted">
        Drag a task here to block 45 min (coming soon).
      </p>
    </section>
  );
}

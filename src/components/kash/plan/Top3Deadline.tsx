"use client";

import { useState } from "react";

import { useWindDownHour } from "@/hooks/useWindDownHour";
import { formatHourLabel, WIND_DOWN_MAX_HOUR, WIND_DOWN_MIN_HOUR } from "@/lib/eod/wind-down";

const WIND_DOWN_HOURS = Array.from(
  { length: WIND_DOWN_MAX_HOUR - WIND_DOWN_MIN_HOUR + 1 },
  (_, i) => WIND_DOWN_MIN_HOUR + i
);

/**
 * The wind-down anchor, editable inline (Today §6 Thread 1: a single wind-down
 * time the day's review nudge fires from). Shown beside the Top-3 heading as a
 * calm cue for when to wrap up — never a hard deadline.
 */
export function Top3Deadline({ visible = true }: { visible?: boolean }) {
  const [windDownHour, setWindDownHour] = useWindDownHour();
  const [editing, setEditing] = useState(false);

  if (!visible) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-ink-muted">
      {editing ? (
        <select
          aria-label="Wind-down time"
          autoFocus
          className="rounded-pill border bg-surface px-1 py-0.5 text-xs text-ink"
          value={windDownHour}
          onChange={(e) => setWindDownHour(Number(e.target.value))}
          onBlur={() => setEditing(false)}
        >
          {WIND_DOWN_HOURS.map((h) => (
            <option key={h} value={h}>
              wind down {formatHourLabel(h)}
            </option>
          ))}
        </select>
      ) : (
        <button
          type="button"
          className="rounded-pill border bg-surface px-1.5 py-0.5 text-xs hover:text-accent"
          onClick={() => setEditing(true)}
          title="Change your wind-down time"
        >
          wind down {formatHourLabel(windDownHour)}
        </button>
      )}
    </div>
  );
}

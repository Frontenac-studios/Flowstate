"use client";

import { useState } from "react";

import { useWindDownHour } from "@/hooks/useWindDownHour";
import {
  formatHourLabel,
  top3TargetHour,
  WIND_DOWN_MAX_HOUR,
  WIND_DOWN_MIN_HOUR,
} from "@/lib/eod/wind-down";

const WIND_DOWN_HOURS = Array.from(
  { length: WIND_DOWN_MAX_HOUR - WIND_DOWN_MIN_HOUR + 1 },
  (_, i) => WIND_DOWN_MIN_HOUR + i
);

/**
 * The Top-3 target — one hour before the user's wind-down — with the wind-down
 * time editable inline (Today §6 Thread 1: a single wind-down anchor the target
 * derives from). The review nudge fires at wind-down; the target reads as a calm
 * "aim to finish by" cue, never a hard deadline.
 */
export function Top3Deadline({ visible = true }: { visible?: boolean }) {
  const [windDownHour, setWindDownHour] = useWindDownHour();
  const [editing, setEditing] = useState(false);
  const target = top3TargetHour(windDownHour);

  if (!visible) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-ink-muted">
      <span title="Aim to finish your Top 3 an hour before you wind down">
        Top 3 by <span className="font-medium text-ink">{formatHourLabel(target)}</span>
      </span>
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

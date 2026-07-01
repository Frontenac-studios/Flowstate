"use client";

import { useState } from "react";

import { useWeekWindDown } from "@/hooks/useWeekWindDown";
import {
  clampWeekWindDownDay,
  clampWeekWindDownHour,
  formatWeekWindDownLabel,
  WEEK_WIND_DOWN_MAX_DAY,
  WEEK_WIND_DOWN_MAX_HOUR,
  WEEK_WIND_DOWN_MIN_DAY,
  WEEK_WIND_DOWN_MIN_HOUR,
  WEEKDAY_LABELS,
} from "@/lib/eow/week-wind-down";

const WIND_DOWN_DAYS = Array.from(
  { length: WEEK_WIND_DOWN_MAX_DAY - WEEK_WIND_DOWN_MIN_DAY + 1 },
  (_, i) => WEEK_WIND_DOWN_MIN_DAY + i
);

const WIND_DOWN_HOURS = Array.from(
  { length: WEEK_WIND_DOWN_MAX_HOUR - WEEK_WIND_DOWN_MIN_HOUR + 1 },
  (_, i) => WEEK_WIND_DOWN_MIN_HOUR + i
);

/** Configurable week wind-down (default Sun eve) — drives the EoW review chip. */
export default function WeekWindDownSetting() {
  const [weekWindDown, setWeekWindDown] = useWeekWindDown();
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex items-center gap-1.5 text-xs text-ink-muted">
      <span title="When your week winds down and the review nudge may appear">
        Week wind-down{" "}
        <span className="font-medium text-ink">{formatWeekWindDownLabel(weekWindDown)}</span>
      </span>
      {editing ? (
        <span className="flex items-center gap-1">
          <select
            aria-label="Week wind-down day"
            autoFocus
            className="rounded-pill border bg-surface px-1 py-0.5 text-xs text-ink"
            value={weekWindDown.day}
            onChange={(e) =>
              setWeekWindDown({
                ...weekWindDown,
                day: clampWeekWindDownDay(Number(e.target.value)),
              })
            }
          >
            {WIND_DOWN_DAYS.map((day) => (
              <option key={day} value={day}>
                {WEEKDAY_LABELS[day]}
              </option>
            ))}
          </select>
          <select
            aria-label="Week wind-down hour"
            className="rounded-pill border bg-surface px-1 py-0.5 text-xs text-ink"
            value={weekWindDown.hour}
            onChange={(e) =>
              setWeekWindDown({
                ...weekWindDown,
                hour: clampWeekWindDownHour(Number(e.target.value)),
              })
            }
            onBlur={() => setEditing(false)}
          >
            {WIND_DOWN_HOURS.map((h) => (
              <option key={h} value={h}>
                {h}:00
              </option>
            ))}
          </select>
        </span>
      ) : (
        <button
          type="button"
          className="rounded-pill border bg-surface px-1.5 py-0.5 text-xs hover:text-accent"
          onClick={() => setEditing(true)}
          title="Change your week wind-down time"
        >
          edit
        </button>
      )}
    </div>
  );
}

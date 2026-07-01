"use client";

import { useEffect, useId, useState } from "react";

import Checkbox from "@/components/kash/ui/Checkbox";
import Input from "@/components/kash/ui/Input";
import Select from "@/components/kash/ui/Select";
import { formatRruleLabel } from "@/lib/recurrence/format-label";
import {
  RRULE_WEEKDAYS,
  type RepeatEnds,
  type RepeatFrequency,
  type RepeatPickerState,
  type RruleWeekday,
  defaultRepeatPickerState,
  parseRruleToPickerState,
  serializePickerStateToRrule,
} from "@/lib/recurrence/picker";

const WEEKDAY_LABELS: Record<RruleWeekday, string> = {
  SU: "Sun",
  MO: "Mon",
  TU: "Tue",
  WE: "Wed",
  TH: "Thu",
  FR: "Fri",
  SA: "Sat",
};

type Props = {
  rrule: string | null;
  startDate: string;
  disabled?: boolean;
  onChange: (next: { rrule: string | null; startDate: string }) => void;
};

export default function RepeatPicker({ rrule, startDate, disabled = false, onChange }: Props) {
  const repeatOnId = useId();
  const [enabled, setEnabled] = useState(Boolean(rrule));
  const [state, setState] = useState<RepeatPickerState>(() =>
    rrule ? parseRruleToPickerState(rrule, startDate) : defaultRepeatPickerState(startDate)
  );

  useEffect(() => {
    setEnabled(Boolean(rrule));
    if (rrule) {
      setState(parseRruleToPickerState(rrule, startDate));
    }
  }, [rrule, startDate]);

  const emit = (nextEnabled: boolean, nextState: RepeatPickerState, nextStartDate = startDate) => {
    if (!nextEnabled) {
      onChange({ rrule: null, startDate: nextStartDate });
      return;
    }
    onChange({
      rrule: serializePickerStateToRrule(nextState, nextStartDate),
      startDate: nextStartDate,
    });
  };

  const updateState = (patch: Partial<RepeatPickerState>) => {
    const next = { ...state, ...patch };
    setState(next);
    if (enabled) emit(true, next);
  };

  const updateEnds = (ends: RepeatEnds) => {
    updateState({ ends });
  };

  const toggleWeekday = (day: RruleWeekday) => {
    const has = state.byWeekday.includes(day);
    const nextDays = has ? state.byWeekday.filter((d) => d !== day) : [...state.byWeekday, day];
    updateState({ byWeekday: nextDays });
  };

  const summary = enabled ? formatRruleLabel(serializePickerStateToRrule(state, startDate)) : null;

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-sm text-ink">
        <Checkbox
          id={repeatOnId}
          checked={enabled}
          disabled={disabled}
          onChange={(e) => {
            const nextEnabled = e.target.checked;
            setEnabled(nextEnabled);
            const nextState = nextEnabled
              ? rrule
                ? parseRruleToPickerState(rrule, startDate)
                : defaultRepeatPickerState(startDate)
              : state;
            if (nextEnabled) setState(nextState);
            emit(nextEnabled, nextState);
          }}
        />
        <span className="font-medium">Repeat</span>
      </label>

      {enabled ? (
        <div className="bg-surface-2/40 flex flex-col gap-3 rounded-card border border-subtle p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="repeat-starts" className="text-sm font-medium text-ink">
                Starts
              </label>
              <Input
                id="repeat-starts"
                type="date"
                className="text-sm"
                value={startDate}
                disabled={disabled}
                onChange={(e) => {
                  if (!e.target.value) return;
                  emit(enabled, state, e.target.value);
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="repeat-frequency" className="text-sm font-medium text-ink">
                Frequency
              </label>
              <Select
                id="repeat-frequency"
                className="w-full text-sm"
                value={state.frequency}
                disabled={disabled}
                onChange={(e) => updateState({ frequency: e.target.value as RepeatFrequency })}
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="repeat-interval" className="text-sm font-medium text-ink">
                Every
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id="repeat-interval"
                  type="number"
                  min={1}
                  max={99}
                  className="w-20 text-sm"
                  value={state.interval}
                  disabled={disabled}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n) && n >= 1) updateState({ interval: Math.floor(n) });
                  }}
                />
                <span className="text-sm text-ink-muted">
                  {state.frequency === "DAILY"
                    ? "day(s)"
                    : state.frequency === "WEEKLY"
                      ? "week(s)"
                      : "month(s)"}
                </span>
              </div>
            </div>
          </div>

          {state.frequency === "WEEKLY" ? (
            <fieldset className="flex flex-col gap-1.5">
              <legend className="text-sm font-medium text-ink">On days</legend>
              <div className="flex flex-wrap gap-1.5">
                {RRULE_WEEKDAYS.map((day) => {
                  const selected = state.byWeekday.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={disabled}
                      aria-pressed={selected}
                      onClick={() => toggleWeekday(day)}
                      className={`rounded-pill border px-2.5 py-1 text-xs transition ${
                        selected
                          ? "text-on-accent border-accent bg-accent"
                          : "border-border bg-surface text-ink-muted hover:text-ink"
                      }`}
                    >
                      {WEEKDAY_LABELS[day]}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          {state.frequency === "MONTHLY" ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="repeat-month-day" className="text-sm font-medium text-ink">
                Day of month
              </label>
              <Input
                id="repeat-month-day"
                type="number"
                min={1}
                max={31}
                className="w-24 text-sm"
                value={state.monthDay}
                disabled={disabled}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n >= 1 && n <= 31) {
                    updateState({ monthDay: Math.floor(n) });
                  }
                }}
              />
            </div>
          ) : null}

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-ink">Ends</legend>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="radio"
                name="repeat-ends"
                checked={state.ends.kind === "never"}
                disabled={disabled}
                onChange={() => updateEnds({ kind: "never" })}
              />
              Never
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="radio"
                name="repeat-ends"
                checked={state.ends.kind === "count"}
                disabled={disabled}
                onChange={() =>
                  updateEnds({
                    kind: "count",
                    count: state.ends.kind === "count" ? state.ends.count : 10,
                  })
                }
              />
              After
              <Input
                type="number"
                min={1}
                max={999}
                className="w-20 text-sm"
                value={state.ends.kind === "count" ? state.ends.count : 10}
                disabled={disabled || state.ends.kind !== "count"}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n >= 1) {
                    updateEnds({ kind: "count", count: Math.floor(n) });
                  }
                }}
              />
              occurrence(s)
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="radio"
                name="repeat-ends"
                checked={state.ends.kind === "until"}
                disabled={disabled}
                onChange={() =>
                  updateEnds({
                    kind: "until",
                    until: state.ends.kind === "until" ? state.ends.until : startDate,
                  })
                }
              />
              On
              <Input
                type="date"
                className="text-sm"
                value={state.ends.kind === "until" ? state.ends.until : startDate}
                disabled={disabled || state.ends.kind !== "until"}
                onChange={(e) => {
                  if (e.target.value) updateEnds({ kind: "until", until: e.target.value });
                }}
              />
            </label>
          </fieldset>

          {summary ? (
            <p className="text-xs text-ink-muted" aria-live="polite">
              {summary}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

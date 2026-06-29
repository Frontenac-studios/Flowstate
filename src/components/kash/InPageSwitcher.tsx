"use client";

import { useRef } from "react";

import { cn } from "@/lib/cn";

export type SwitcherOption<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  options: ReadonlyArray<SwitcherOption<T>>;
  /**
   * The selected option's value. Typed loosely (compared by equality only) so a
   * caller may pass a "none selected" sentinel — e.g. the Gantt zoom's "auto" —
   * which simply leaves every segment unpressed. `onChange` stays typed to `T`.
   */
  value: string;
  onChange: (value: T) => void;
  /** Required label for the control's `role="group"` (e.g. "Plan mode"). */
  ariaLabel: string;
};

/**
 * The shared in-page segmented control: an inset white pill (the active option)
 * riding a soft-gray `--active-surface` track (DT-7). The raised pill reads as
 * raised purely via `--active-raised-border` — strictly flat, no shadow.
 * Presentational and fully controlled — callers own the value and its
 * persistence — so it can back Today's Day/Week, the Projects view/zoom toggles,
 * and the Plan/Care sub-view switchers without bespoke markup each time.
 */
export function InPageSwitcher<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: Props<T>) {
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const moveFocus = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    buttonsRef.current[index]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      moveFocus((index + 1) % options.length);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      moveFocus((index - 1 + options.length) % options.length);
    }
  };

  return (
    <div
      className="rounded-pill inline-flex gap-[2px] bg-active-surface p-[2px] text-sm"
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option, index) => {
        const pressed = value === option.value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              buttonsRef.current[index] = el;
            }}
            type="button"
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            aria-pressed={pressed}
            className={cn(
              "rounded-pill border px-3 py-1 transition-colors",
              pressed
                ? "border-active-raised-border bg-active-raised text-ink"
                : "border-transparent bg-transparent text-ink-muted hover:text-ink"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

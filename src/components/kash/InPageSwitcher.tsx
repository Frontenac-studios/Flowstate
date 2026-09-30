"use client";

import { useRef, type ReactNode } from "react";

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
  /** Optional control clustered after the segments (e.g. Today add-task +). */
  trailing?: ReactNode;
  /** Stretch the track to its container, segments sharing the width (a rail switch). */
  fullWidth?: boolean;
};

/**
 * The shared in-page segmented control (Spec v2/v3 Cc): an inset white pill (the
 * active option, 13/600) riding a soft-gray `--active-surface` track. The raised pill
 * reads as raised purely via `--active-raised-border` — strictly flat, no shadow. Use
 * it instead of a select for 2–3 short options.
 * Presentational and fully controlled — callers own the value and its
 * persistence — so it can back Today's Day/Week, the Projects view/zoom toggles,
 * and the Plan sub-view switchers without bespoke markup each time.
 */
export function InPageSwitcher<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  trailing,
  fullWidth = false,
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
      className={cn(
        "items-center gap-[var(--space-0)] rounded-pill bg-active-surface p-[3px] text-meta",
        fullWidth ? "flex w-full" : "inline-flex"
      )}
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
              "kash-focus-visible rounded-pill border px-3.5 py-1 outline-none transition-colors motion-reduce:transition-none",
              fullWidth && "flex-1",
              pressed
                ? "border-active-raised-border bg-active-raised font-semibold text-ink"
                : "border-transparent bg-transparent text-ink-muted hover:text-ink"
            )}
          >
            {option.label}
          </button>
        );
      })}
      {trailing ? <div className="flex items-center pl-0.5">{trailing}</div> : null}
    </div>
  );
}

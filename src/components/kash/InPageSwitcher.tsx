"use client";

import { useRef } from "react";

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
 * The shared in-page segmented control: a glass pill of mutually-exclusive
 * options. Presentational and fully controlled — callers own the value and its
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
    <div className="glass-pill flex text-sm" role="group" aria-label={ariaLabel}>
      {options.map((option, index) => (
        <button
          key={option.value}
          ref={(el) => {
            buttonsRef.current[index] = el;
          }}
          type="button"
          onClick={() => onChange(option.value)}
          onKeyDown={(e) => onKeyDown(e, index)}
          aria-pressed={value === option.value}
          className={`rounded-full px-3 py-1 transition ${
            value === option.value
              ? "bg-kash-accent text-white"
              : "text-kash-ink-muted hover:text-kash-ink"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

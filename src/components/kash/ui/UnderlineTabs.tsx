"use client";

import { useRef, type KeyboardEvent } from "react";

import { cn } from "@/lib/cn";

export type UnderlineTab<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  tabs: ReadonlyArray<UnderlineTab<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  /** Underline colour: the project's hue on a project page, ink elsewhere (Calendar). */
  accent?: string;
  className?: string;
};

/**
 * Spec v4 ToggleB underline tabs: 15/600, active in ink with a 2px underline in the
 * accent colour, the rest muted, over a hairline. Arrow keys move between tabs.
 */
export function UnderlineTabs<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
  accent = "var(--ink)",
  className,
}: Props<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (index + step + tabs.length) % tabs.length;
    const tab = tabs[next];
    if (!tab) return;
    onChange(tab.value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("flex gap-6 overflow-x-auto border-b border-control-border", className)}
    >
      {tabs.map((tab, index) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              "shrink-0 whitespace-nowrap pb-2.5 text-body font-semibold outline-none transition-colors focus-visible:underline focus-visible:decoration-2 focus-visible:underline-offset-4",
              active ? "text-ink" : "text-ink-muted hover:text-ink"
            )}
            style={active ? { boxShadow: `inset 0 -2px 0 ${accent}` } : undefined}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

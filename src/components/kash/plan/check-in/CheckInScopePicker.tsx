"use client";

import type { CheckInDepth } from "@/lib/planning/check-in";
import { CHECK_IN_DEPTH_OPTIONS } from "@/lib/planning/check-in";

type Props = {
  value: CheckInDepth | null;
  onChange: (depth: CheckInDepth) => void;
};

/**
 * PM7-4 small-bite scope picker — asks how deep to go each run.
 */
export default function CheckInScopePicker({ value, onChange }: Props) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-ink">How deep should we go?</legend>
      <p className="mb-1 text-caption text-ink-muted">
        Pick a small bite — you can always come back for more.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {CHECK_IN_DEPTH_OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={`rounded-card border px-3 py-2.5 text-left transition duration-short ease-enter focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)] ${
                selected
                  ? "border-ink bg-surface-2 text-ink"
                  : "border-subtle bg-surface text-ink-muted hover:border-ink-muted hover:text-ink"
              }`}
            >
              <span className="block text-sm font-medium">{option.label}</span>
              <span className="mt-0.5 block text-caption">{option.hint}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

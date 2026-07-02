"use client";

import { useMemo } from "react";

import type { EssentialNudgeChipPayload } from "@/lib/nudges/essential-nudge-types";

type Props = {
  opener: EssentialNudgeChipPayload | null;
  onSkip: () => void;
  onBegin: () => void;
};

export function MorningHandoffModal({ opener, onSkip, onBegin }: Props) {
  const openerText = useMemo(
    () => opener?.message ?? "Quick hand-off: choose your Top 3 and begin gently.",
    [opener]
  );

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-black/20 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="morning-handoff-title"
    >
      <div className="max-w-md rounded-card border border-border bg-surface p-8 shadow-overlay">
        <h2 id="morning-handoff-title" className="text-xl font-semibold text-ink">
          Good morning
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Carry over only what still matters, set Top 3, and optionally hold a 45-minute focus
          sprint.
        </p>
        <p className="mt-4 rounded-row border border-subtle bg-surface px-3 py-2 text-sm text-ink">
          {openerText}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-pill border border-border bg-surface px-6 py-2.5 text-sm text-ink-muted transition hover:text-ink"
            onClick={onSkip}
          >
            Skip
          </button>
          <button
            type="button"
            className="rounded-pill border-[1.5px] border-ink bg-surface px-6 py-2.5 text-sm font-medium text-ink transition hover:bg-[var(--accent-soft)]"
            onClick={onBegin}
          >
            Begin
          </button>
        </div>
      </div>
    </div>
  );
}

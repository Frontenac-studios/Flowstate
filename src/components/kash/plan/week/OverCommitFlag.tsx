"use client";

import type { OverCommitThresholdMode } from "@/lib/week/over-commit-threshold";

type Props = {
  mode: OverCommitThresholdMode;
};

/**
 * Gentle, non-blocking day-overload flag (Week WD3). Never blocks drops or edits.
 */
export default function OverCommitFlag({ mode }: Props) {
  const detail =
    mode === "learned" ? "More than usual for you" : "Above the default planning guide";

  return (
    <p
      className="mt-0.5 text-caption text-ink-muted"
      role="note"
      aria-label={`Heavy day. ${detail}.`}
    >
      Heavy day
      <span className="text-ink-faint"> · {detail.toLowerCase()}</span>
    </p>
  );
}

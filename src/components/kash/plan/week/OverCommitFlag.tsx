"use client";

import Tooltip from "@/components/kash/ui/Tooltip";
import type { OverCommitThresholdMode } from "@/lib/week/over-commit-threshold";

type Props = {
  mode: OverCommitThresholdMode;
};

const MODE_TOOLTIP: Record<OverCommitThresholdMode, string> = {
  "cold-start": "learning…",
  learned: "based on your patterns",
};

/**
 * Gentle, non-blocking day-overload flag (Week WD3). Never blocks drops or edits.
 */
export default function OverCommitFlag({ mode }: Props) {
  const tooltip = MODE_TOOLTIP[mode];

  return (
    <Tooltip content={tooltip}>
      <p
        className="mt-0.5 text-caption text-ink-muted"
        role="note"
        aria-label={`Heavy day. ${tooltip}.`}
      >
        Heavy day
        <span className="text-ink-faint"> · {tooltip}</span>
      </p>
    </Tooltip>
  );
}

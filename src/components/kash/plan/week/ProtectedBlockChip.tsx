"use client";

import type { ProjectCategory } from "@/lib/projects/categories";
import { categoryLabel } from "@/lib/projects/categories";
import { categorySolidVar } from "@/lib/projects/category-tokens";

export type ProtectedBlockRow = {
  id: string;
  category: ProjectCategory;
  label: string | null;
  startMin: number | null;
  endMin: number | null;
  status: "proposed" | "confirmed";
};

type Props = {
  block: ProtectedBlockRow;
  compact?: boolean;
  onRemove?: (id: string) => void;
  /** AN §5 / WD7: scale + fade when the block lands in a week column or ritual bar. */
  animatePlace?: boolean;
};

function formatTimeRange(startMin: number, endMin: number): string {
  const fmt = (min: number) => {
    const h24 = Math.floor(min / 60);
    const m = min % 60;
    const h = h24 % 12 === 0 ? 12 : h24 % 12;
    const period = h24 < 12 ? "a" : "p";
    return m === 0 ? `${h}${period}` : `${h}:${String(m).padStart(2, "0")}${period}`;
  };
  return `${fmt(startMin)}–${fmt(endMin)}`;
}

export default function ProtectedBlockChip({
  block,
  compact = false,
  onRemove,
  animatePlace = false,
}: Props) {
  const title = block.label?.trim() || categoryLabel(block.category);
  const timed =
    block.startMin != null && block.endMin != null
      ? formatTimeRange(block.startMin, block.endMin)
      : null;
  const proposed = block.status === "proposed";

  return (
    <li
      className={`flex items-start gap-2 rounded-row border px-2 py-1.5 text-xs ${
        proposed
          ? "border-dashed border-[var(--border)] bg-[var(--surface-2)]"
          : "border-[var(--border-subtle)] bg-[var(--surface)]"
      } ${animatePlace ? "protected-place" : ""}`}
    >
      <span
        className="mt-0.5 w-[var(--stripe-width)] shrink-0 self-stretch rounded-full"
        style={{ backgroundColor: categorySolidVar(block.category) }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">
          <span aria-hidden className="mr-1">
            ⬚
          </span>
          {title}
          {!compact ? <span className="font-normal text-ink-muted"> · protected</span> : null}
        </p>
        {timed ? <p className="text-caption text-ink-faint">{timed}</p> : null}
        {proposed ? <p className="text-caption text-ink-faint">Proposed</p> : null}
      </div>
      {onRemove ? (
        <button
          type="button"
          className="shrink-0 text-ink-faint hover:text-ink"
          aria-label={`Remove protected block ${title}`}
          onClick={() => onRemove(block.id)}
        >
          ×
        </button>
      ) : null}
    </li>
  );
}

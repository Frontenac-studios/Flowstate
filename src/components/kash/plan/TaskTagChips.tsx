"use client";

import { Hash, withKashIcon } from "@/components/kash/ui/icon";

const HashIcon = withKashIcon(Hash);

type Props = {
  tags: string[];
  /** When set, only the first N tags render before a "+N" overflow chip. */
  maxVisible?: number;
  className?: string;
};

/** Compact read-only tag chips for task rows (Phase 5 / F3). */
export function TaskTagChips({ tags, maxVisible = 3, className = "" }: Props) {
  if (!tags.length) return null;

  const visible = tags.slice(0, maxVisible);
  const overflow = tags.length - visible.length;

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {visible.map((tag) => (
        <span
          key={tag}
          className="inline-flex max-w-[8rem] items-center gap-0.5 truncate rounded-pill border border-border bg-surface-2 px-1.5 py-0.5 text-caption text-ink-muted"
          title={tag}
        >
          <HashIcon size={9} className="shrink-0 text-ink-faint" aria-hidden />
          <span className="truncate">{tag}</span>
        </span>
      ))}
      {overflow > 0 ? (
        <span className="rounded-pill border border-border px-1.5 py-0.5 text-caption text-ink-faint">
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}

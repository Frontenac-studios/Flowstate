"use client";

import { useCallback, useState } from "react";

export type GhostedSuggestionItem = {
  id: string;
  label: string;
  detail?: string;
};

type Props = {
  items: GhostedSuggestionItem[];
  onStage: (id: string) => void;
  onDismiss: (id: string) => void;
  onApply: () => void;
  stagedIds: ReadonlySet<string>;
  applyLabel?: string;
  className?: string;
};

/**
 * Reusable ghosted-accept pattern (planning-mode §9 GA-1–GA-5).
 * Dashed provisional rows, per-item ✓/✕, batch Apply for staged items.
 */
export default function GhostedAccept({
  items,
  onStage,
  onDismiss,
  onApply,
  stagedIds,
  applyLabel = "Apply",
  className = "",
}: Props) {
  const stagedCount = items.filter((i) => stagedIds.has(i.id)).length;

  if (items.length === 0) return null;

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <ul className="flex flex-col gap-2" aria-label="Suggested changes">
        {items.map((item) => {
          const staged = stagedIds.has(item.id);
          return (
            <li
              key={item.id}
              className="border-kash-ink/25 bg-kash-ink/[0.02] flex items-start justify-between gap-3 rounded-lg border border-dashed px-3 py-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <span className="mr-2 text-xs font-medium uppercase tracking-wide text-kash-ink-muted">
                  ✦ suggested
                </span>
                <span className={staged ? "text-kash-ink" : "text-kash-ink/70"}>{item.label}</span>
                {item.detail ? (
                  <p className="mt-0.5 text-xs text-kash-ink-muted">{item.detail}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  aria-label={`Accept suggestion: ${item.label}`}
                  aria-pressed={staged}
                  onClick={() => onStage(item.id)}
                  className="hover:bg-kash-ink/5 rounded px-2 py-1 text-kash-ink"
                >
                  ✓
                </button>
                <button
                  type="button"
                  aria-label={`Dismiss suggestion: ${item.label}`}
                  onClick={() => onDismiss(item.id)}
                  className="hover:bg-kash-ink/5 rounded px-2 py-1 text-kash-ink-muted"
                >
                  ✕
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {stagedCount > 0 ? (
        <button type="button" onClick={onApply} className="btn-outline self-start text-sm">
          {applyLabel} ({stagedCount})
        </button>
      ) : null}
    </div>
  );
}

/** Demo hook for placeholder panels — wires local stage state only. */
export function useGhostedAcceptDemo(items: GhostedSuggestionItem[]) {
  const [stagedIds, setStagedIds] = useState<Set<string>>(new Set());

  const onStage = useCallback((id: string) => {
    setStagedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const onDismiss = useCallback((id: string) => {
    setStagedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    void id;
  }, []);

  const onApply = useCallback(() => {
    setStagedIds(new Set());
  }, []);

  return { items, stagedIds, onStage, onDismiss, onApply };
}

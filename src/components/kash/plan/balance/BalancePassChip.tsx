"use client";

import BalancePassGhosts from "./BalancePassGhosts";

type Props = {
  scopeKey: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  onDismiss: () => void;
};

/**
 * Dismissible balance-pass affordance (PM6-2). Never blocks navigation.
 */
export default function BalancePassChip({ scopeKey, count, expanded, onToggle, onDismiss }: Props) {
  return (
    <div
      className="border-ink/15 fixed bottom-6 right-6 z-toast max-w-md rounded-xl border bg-surface shadow-overlay"
      role="complementary"
      aria-label="Balance pass suggestions"
    >
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          className="hover:bg-ink/5 flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-0.5 text-left focus:outline-none focus-visible:shadow-[inset_0_0_0_var(--focus-ring-width)_var(--ink)]"
          aria-expanded={expanded}
        >
          <span className="text-sm font-medium text-ink">Balance pass</span>
          <span className="bg-ink/10 rounded-full px-2 py-0.5 text-caption font-medium text-ink-muted">
            {count}
          </span>
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss balance pass"
          className="hover:bg-ink/5 shrink-0 rounded px-2 py-1 text-ink-muted focus:outline-none focus-visible:shadow-[inset_0_0_0_var(--focus-ring-width)_var(--ink)]"
        >
          ✕
        </button>
      </div>

      {expanded ? (
        <div className="border-ink/10 max-h-[min(50vh,24rem)] overflow-y-auto border-t px-4 py-3">
          <p className="mb-3 text-caption text-ink-muted">
            Optional suggestions to rebalance categories — accept or dismiss each one.
          </p>
          <BalancePassGhosts scopeKey={scopeKey} />
        </div>
      ) : null}
    </div>
  );
}

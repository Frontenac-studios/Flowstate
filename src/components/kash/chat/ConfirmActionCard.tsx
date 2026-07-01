"use client";

import { useCallback, useMemo, useState } from "react";

import type { ProposedAction } from "@/lib/chat/proposed-actions";
import { proposalHeadline } from "@/lib/chat/proposed-actions";

type Props = {
  proposal: ProposedAction;
  busy?: boolean;
  onConfirm: (enabledItemIds: string[]) => void;
  onDismiss: () => void;
};

function itemLabel(action: ProposedAction, item: ProposedAction["items"][number]): string {
  if (action.kind === "reschedule_tasks" && "scheduledDate" in item) {
    return `${item.title} → ${item.scheduledDate}`;
  }
  if (action.kind === "create_task" && "title" in item) {
    const parts = [item.title];
    if ("scheduledDate" in item && item.scheduledDate) parts.push(`(${item.scheduledDate})`);
    if ("projectSlug" in item && item.projectSlug) parts.push(`#${item.projectSlug}`);
    return parts.join(" ");
  }
  return item.title;
}

export function ConfirmActionCard({ proposal, busy = false, onConfirm, onDismiss }: Props) {
  const [enabledIds, setEnabledIds] = useState<Set<string>>(
    () => new Set(proposal.items.map((item) => item.itemId))
  );

  const toggleItem = useCallback((itemId: string) => {
    setEnabledIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const enabledCount = useMemo(
    () => proposal.items.filter((item) => enabledIds.has(item.itemId)).length,
    [enabledIds, proposal.items]
  );

  if (proposal.status !== "pending") return null;

  return (
    <div className="mt-2 rounded-[var(--radius-row)] border border-dashed border-border bg-surface-2 px-3 py-2 text-sm">
      <p className="mb-2 font-medium text-ink">{proposalHeadline(proposal)}</p>
      <ul className="mb-3 flex flex-col gap-1.5" aria-label="Proposed changes">
        {proposal.items.map((item) => {
          const checked = enabledIds.has(item.itemId);
          return (
            <li key={item.itemId} className="flex items-start gap-2">
              <input
                type="checkbox"
                id={`proposal-${item.itemId}`}
                checked={checked}
                disabled={busy}
                onChange={() => toggleItem(item.itemId)}
                className="mt-0.5"
              />
              <label
                htmlFor={`proposal-${item.itemId}`}
                className={checked ? "text-ink" : "text-ink-muted line-through"}
              >
                {itemLabel(proposal, item)}
              </label>
            </li>
          );
        })}
      </ul>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || enabledCount === 0}
          onClick={() =>
            onConfirm(proposal.items.filter((i) => enabledIds.has(i.itemId)).map((i) => i.itemId))
          }
          className="rounded-control border-[1.5px] border-ink px-3 py-1 text-xs text-ink transition hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] disabled:opacity-50"
        >
          Confirm
          {enabledCount > 0 && enabledCount < proposal.items.length ? ` ${enabledCount}` : ""}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDismiss}
          className="rounded-control border border-border px-3 py-1 text-xs text-ink-muted transition hover:text-ink disabled:opacity-50"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

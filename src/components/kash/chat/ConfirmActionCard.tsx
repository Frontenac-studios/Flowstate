"use client";

import { useCallback, useMemo, useState } from "react";

import Checkbox from "@/components/kash/ui/Checkbox";
import type { ProposedAction } from "@/lib/chat/proposed-actions";
import { proposalHeadline } from "@/lib/chat/proposed-actions";

type Props = {
  proposal: ProposedAction;
  busy?: boolean;
  onConfirm: (enabledItemIds: string[]) => void;
  onDismiss: () => void;
};

function itemLabel(action: ProposedAction, item: ProposedAction["items"][number]): string {
  switch (action.kind) {
    case "reschedule_tasks": {
      const row = item as Extract<ProposedAction, { kind: "reschedule_tasks" }>["items"][number];
      return `${row.title} → ${row.scheduledDate}`;
    }
    case "create_task": {
      const row = item as Extract<ProposedAction, { kind: "create_task" }>["items"][number];
      const parts = [row.title];
      const suggested = row.suggestedDate ?? row.scheduledDate;
      if (suggested) parts.push(`(${suggested})`);
      if (row.projectSlug) parts.push(`#${row.projectSlug}`);
      return parts.join(" ");
    }
    case "complete_task": {
      const row = item as Extract<ProposedAction, { kind: "complete_task" }>["items"][number];
      return row.title;
    }
    case "edit_task": {
      const row = item as Extract<ProposedAction, { kind: "edit_task" }>["items"][number];
      const parts = [row.title];
      if (row.nextTitle && row.nextTitle !== row.title) parts.push(`→ ${row.nextTitle}`);
      if (row.scheduledDate !== undefined) parts.push(`due ${row.scheduledDate ?? "unscheduled"}`);
      if (row.priority !== undefined) parts.push(`p${row.priority}`);
      return parts.join(" · ");
    }
    case "delete_task": {
      const row = item as Extract<ProposedAction, { kind: "delete_task" }>["items"][number];
      return `Delete ${row.title}`;
    }
    case "set_top3": {
      const row = item as Extract<ProposedAction, { kind: "set_top3" }>["items"][number];
      return `Slot ${row.slot}: ${row.title}`;
    }
    case "set_protected_block": {
      const row = item as Extract<ProposedAction, { kind: "set_protected_block" }>["items"][number];
      const label = row.label ?? row.category;
      return `${label} · ${row.scheduledDate}`;
    }
    case "set_day_priorities": {
      const row = item as Extract<ProposedAction, { kind: "set_day_priorities" }>["items"][number];
      return `${row.title} → priority ${row.slot} (${row.scheduledDate})`;
    }
    case "apply_balance_suggestions": {
      const row = item as Extract<
        ProposedAction,
        { kind: "apply_balance_suggestions" }
      >["items"][number];
      return `${row.taskTitle} (${row.category})`;
    }
    case "create_project": {
      const row = item as Extract<ProposedAction, { kind: "create_project" }>["items"][number];
      return `${row.name} · ${row.category}`;
    }
    case "edit_phase": {
      const row = item as Extract<ProposedAction, { kind: "edit_phase" }>["items"][number];
      return `${row.projectSlug} / ${row.phaseName}`;
    }
    case "move_task_to_phase": {
      const row = item as Extract<ProposedAction, { kind: "move_task_to_phase" }>["items"][number];
      const dest = row.phaseName ?? "no phase";
      return `${row.title} → ${dest}`;
    }
    case "replan_project_dates": {
      const row = item as Extract<
        ProposedAction,
        { kind: "replan_project_dates" }
      >["items"][number];
      const start = row.startDate;
      const end = row.endDate;
      const range =
        start && end ? `${start} → ${end}` : end ? `→ ${end}` : start ? `${start} →` : "new dates";
      const label = row.projectSlug ? `${row.projectSlug} / ${row.phaseName}` : row.phaseName;
      return row.previousEndDate
        ? `${label}: ${range} (was ${row.previousEndDate})`
        : `${label}: ${range}`;
    }
    default:
      return "Change";
  }
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
              <Checkbox
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
          className="rounded-control border-emphasis border-ink px-3 py-1 text-xs text-ink transition hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] disabled:opacity-50"
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

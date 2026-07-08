"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { datesInIsoWeek, parseISODateString, toISODateString } from "@/lib/dates/local-day";
import type { WeekDraftProposal } from "@/lib/week/template-week-draft";
import { renderInlineBold } from "@/lib/markdown/inline-bold";
import { useTRPC } from "@/trpc/client";

type Props = {
  taskTitleById: Record<string, string>;
  anchorDate?: string;
  onClose: () => void;
  onApplied: (count: number) => void;
};

export function WeekDraftPanel({ taskTitleById, anchorDate, onClose, onApplied }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [proposal, setProposal] = useState<WeekDraftProposal | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateMutation = useMutation(trpc.weekDraft.generate.mutationOptions());
  const applyMutation = useMutation(
    trpc.tasks.applyWeekDraft.mutationOptions({
      onSuccess: (data) => {
        void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
        onApplied(data.applied);
        onClose();
      },
    })
  );

  const weekRef = useMemo(
    () => (anchorDate ? parseISODateString(anchorDate) : undefined),
    [anchorDate]
  );

  const grouped = useMemo(() => {
    if (!proposal) return [];
    const weekDates = datesInIsoWeek(weekRef).map(toISODateString);
    const byDate = new Map<string, WeekDraftProposal["assignments"]>();
    for (const iso of weekDates) {
      byDate.set(iso, []);
    }
    for (const row of proposal.assignments) {
      const list = byDate.get(row.scheduledDate);
      if (list) list.push(row);
    }
    return weekDates
      .map((iso) => ({ iso, items: byDate.get(iso) ?? [] }))
      .filter((g) => g.items.length > 0);
  }, [proposal, weekRef]);

  const startedRef = useRef(false);

  const runGenerate = () => {
    setError(null);
    generateMutation.mutate(
      { weekStartIso: anchorDate },
      {
        onSuccess: setProposal,
        onError: () => setError("Could not generate a draft. Try again."),
      }
    );
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    runGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  if (!proposal) {
    return (
      <div className="mt-3 rounded-card border border-subtle bg-surface p-4">
        <p className="text-sm text-ink-muted">
          {generateMutation.isPending
            ? "Drafting your week…"
            : "Kash will suggest how to spread your inbox across this week."}
        </p>
        {error ? (
          <p className="mt-2 text-sm text-critical" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex gap-2">
          {error ? (
            <button
              type="button"
              className="rounded-pill border-emphasis border-ink bg-surface px-4 py-2 text-sm font-medium text-ink transition hover:bg-[var(--accent-soft)]"
              onClick={() => void runGenerate()}
            >
              Retry
            </button>
          ) : null}
          <button
            type="button"
            className="rounded-pill border border-border bg-surface px-4 py-2 text-sm text-ink-muted"
            onClick={onClose}
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 max-h-[50vh] overflow-y-auto rounded-card border border-subtle bg-surface p-4">
      <p className="text-sm text-ink">{renderInlineBold(proposal.summary)}</p>

      <div className="mt-4 space-y-3">
        {grouped.map(({ iso, items }) => (
          <div key={iso}>
            <p className="text-xs font-medium uppercase text-ink-muted">
              {parseISODateString(iso).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </p>
            <ul className="mt-1 space-y-1 text-sm text-ink">
              {items.map((item) => {
                const title = taskTitleById[item.taskId] ?? item.taskId;
                return (
                  <li key={item.taskId} className="text-ink">
                    {title}
                    {item.rationale ? (
                      <span className="text-ink-muted/80 block text-xs">{item.rationale}</span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {proposal.assignments.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">No moves suggested — inbox may be empty.</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-pill border-emphasis border-ink bg-surface px-4 py-2 text-sm font-medium text-ink transition hover:bg-[var(--accent-soft)] disabled:opacity-50"
          disabled={applyMutation.isPending || proposal.assignments.length === 0}
          onClick={() =>
            applyMutation.mutate({
              assignments: proposal.assignments.map((a) => ({
                taskId: a.taskId,
                scheduledDate: a.scheduledDate,
              })),
            })
          }
        >
          {applyMutation.isPending ? "Applying…" : "Accept"}
        </button>
        <button
          type="button"
          className="rounded-pill border border-border bg-surface px-4 py-2 text-sm text-ink-muted"
          onClick={onClose}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

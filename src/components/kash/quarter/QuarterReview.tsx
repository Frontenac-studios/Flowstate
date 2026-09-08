"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { useOptionalToast } from "@/components/kash/ui/ToastProvider";
import { quarterLabel, quarterOf } from "@/lib/quarter/quarter-period";
import {
  classifyOutcome,
  draftLearningRuling,
  draftTargetRuling,
  reviewPhase,
  type DirectionRuling,
  type LearningRuling,
  type TargetOutcome,
  type TargetRuling,
} from "@/lib/quarter/quarter-review";
import { useTRPC } from "@/trpc/client";

const OUTCOME_LABEL: Record<TargetOutcome, string> = {
  met: "✓ met",
  partial: "◑ partial",
  missed: "missed",
};

/** A small segmented ruling picker. */
function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-pill border border-subtle">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-2.5 py-1 text-caption font-medium transition ${
            value === o.value ? "bg-ink text-surface" : "bg-surface text-ink-muted hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * The quarterly review ritual on Quarter (W5g, discovery §6). Mid-quarter it's a
 * quiet one-keystroke entry; in the last week it becomes a banner. Either opens the
 * same in-place panel — pre-answered from the data (bets auto-marked met/partial/
 * missed, rulings drafted), editable — that ends by opening the next quarter (carried
 * bets re-open there, met/dropped are archived to the record). Never auto-drops.
 */
export default function QuarterReview() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const toast = useOptionalToast();

  const { data: directions = [] } = useQuery(trpc.directions.list.queryOptions());
  const { data: bets = [] } = useQuery(trpc.targets.list.queryOptions());
  const { data: learning } = useQuery(trpc.learning.get.queryOptions());
  const { data: milestones = [] } = useQuery({
    ...trpc.phases.listByProject.queryOptions({ projectId: learning?.projectId ?? "" }),
    enabled: learning?.projectId != null,
  });

  const now = new Date();
  const q = quarterOf(now);
  const next = quarterOf(q.end);
  const phase = reviewPhase(q, now);

  const [open, setOpen] = useState(false);
  const [dirRulings, setDirRulings] = useState<Record<string, DirectionRuling>>({});
  const [betRulings, setBetRulings] = useState<Record<string, TargetRuling>>({});
  const [learnRuling, setLearnRuling] = useState<LearningRuling>("carry");

  const apply = useMutation(
    trpc.quarterReview.close.mutationOptions({
      onSuccess: (r) => {
        void queryClient.invalidateQueries(trpc.directions.list.pathFilter());
        void queryClient.invalidateQueries(trpc.targets.list.pathFilter());
        void queryClient.invalidateQueries(trpc.learning.get.pathFilter());
        setOpen(false);
        toast?.toast({
          message: `Opened Q${r.nextQuarter.quarter} — ${r.carried} carried, ${r.done} done, ${r.dropped} dropped.`,
        });
      },
    })
  );

  function openReview() {
    setDirRulings(Object.fromEntries(directions.map((d) => [d.id, "keep" as DirectionRuling])));
    setBetRulings(
      Object.fromEntries(
        bets.map((b) => [b.id, draftTargetRuling(classifyOutcome(b.current, b.measureTarget))])
      )
    );
    setLearnRuling(
      draftLearningRuling(milestones.length, milestones.filter((m) => m.completedAt != null).length)
    );
    setOpen(true);
  }

  function submit() {
    apply.mutate({
      directions: directions.map((d) => ({ id: d.id, ruling: dirRulings[d.id] ?? "keep" })),
      targets: bets.map((b) => ({ id: b.id, ruling: betRulings[b.id] ?? "carry" })),
      learning: learning ? { projectId: learning.projectId, ruling: learnRuling } : null,
    });
  }

  // Nothing to rule on yet.
  if (directions.length === 0 && bets.length === 0 && !learning) return null;

  if (!open) {
    if (phase === "active") {
      return (
        <button
          type="button"
          onClick={openReview}
          className="self-start text-caption font-medium text-ink-muted transition hover:text-ink"
        >
          Review {quarterLabel(q)} →
        </button>
      );
    }

    const met = bets.filter((b) => b.isMet).length;
    const slipped = bets.length - met;
    return (
      <div className="border-accent/40 bg-accent/5 flex items-center justify-between gap-4 rounded-card border p-4">
        <p className="text-sm text-ink">
          Here&apos;s how {quarterLabel(q)} went — {met} met, {slipped} slipped
          {learning ? ", learning advanced" : ""}. Rule on each, then start Q{next.quarter}.
          {phase === "overdue" ? " (closing overdue)" : ""}
        </p>
        <button
          type="button"
          onClick={openReview}
          className="shrink-0 rounded-control bg-ink px-3 py-1.5 text-xs font-medium text-surface transition hover:opacity-90"
        >
          Review &amp; close
        </button>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-surface">
      <h2 className="text-body font-medium text-ink">Close {quarterLabel(q)}</h2>

      {directions.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-caption font-semibold uppercase tracking-wide text-ink-muted">
            Directions
          </p>
          {directions.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-sm text-ink">{d.statement}</span>
              <Segmented
                value={dirRulings[d.id] ?? "keep"}
                onChange={(v) => setDirRulings((r) => ({ ...r, [d.id]: v }))}
                options={[
                  { value: "keep", label: "Keep" },
                  { value: "retire", label: "Retire" },
                ]}
              />
            </div>
          ))}
        </div>
      ) : null}

      {bets.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-caption font-semibold uppercase tracking-wide text-ink-muted">
            The bets
          </p>
          {bets.map((b) => {
            const outcome = classifyOutcome(b.current, b.measureTarget);
            return (
              <div key={b.id} className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="truncate text-sm text-ink">{b.title}</span>
                  <span className="shrink-0 text-caption text-ink-muted">
                    {OUTCOME_LABEL[outcome]}
                  </span>
                </span>
                <Segmented
                  value={betRulings[b.id] ?? "carry"}
                  onChange={(v) => setBetRulings((r) => ({ ...r, [b.id]: v }))}
                  options={[
                    { value: "done", label: "Done" },
                    { value: "carry", label: "Carry" },
                    { value: "drop", label: "Drop" },
                  ]}
                />
              </div>
            );
          })}
        </div>
      ) : null}

      {learning ? (
        <div className="flex flex-col gap-2">
          <p className="text-caption font-semibold uppercase tracking-wide text-ink-muted">
            Learning roadmap
          </p>
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-sm text-ink">{learning.capability}</span>
            <Segmented
              value={learnRuling}
              onChange={setLearnRuling}
              options={[
                { value: "reached", label: "Reached" },
                { value: "carry", label: "Carry" },
                { value: "drop", label: "Drop" },
              ]}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-1 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-control px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:text-ink"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={apply.isPending}
          className="rounded-control bg-ink px-3 py-1.5 text-xs font-medium text-surface transition hover:opacity-90 disabled:opacity-50"
        >
          Open Q{next.quarter}
        </button>
      </div>
    </section>
  );
}

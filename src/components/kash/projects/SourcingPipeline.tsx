"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import Button from "@/components/kash/ui/Button";
import Input from "@/components/kash/ui/Input";
import { useOptionalToast } from "@/components/kash/ui/ToastProvider";
import type { LeadRationale } from "@/lib/sourcing/types";
import { useTRPC } from "@/trpc/client";

const DISMISS_OPTIONS: { value: string; label: string }[] = [
  { value: "wrong_industry", label: "Wrong industry" },
  { value: "too_small", label: "Too small" },
  { value: "too_big", label: "Too big" },
  { value: "bad_timing", label: "Bad timing" },
  { value: "already_know", label: "Already know them" },
  { value: "not_interested", label: "Not interested" },
];

const FACETS = ["fit", "risk", "strategy"] as const;

/**
 * The prospect triage board (W10d) — the gated Pipeline view on Projects. Ranked
 * cards (score + confidence, Fit/Risk/Strategy, gaps), a high-potential/unverified
 * callout, and the triage verbs: dismiss-with-reason, snooze, promote-to-project.
 * Add-by-hand here; the weekly sourced batch is W10i.
 */
export default function SourcingPipeline() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const toast = useOptionalToast();

  const { data: leads = [] } = useQuery(trpc.sourcing.listLeads.queryOptions());

  const invalidate = () => queryClient.invalidateQueries(trpc.sourcing.listLeads.pathFilter());

  const score = useMutation(
    trpc.sourcing.scoreLead.mutationOptions({
      onSuccess: invalidate,
      onError: (e) => toast?.toast({ message: e.message, variant: "error" }),
    })
  );
  const add = useMutation(
    trpc.sourcing.addLead.mutationOptions({
      onSuccess: (lead) => {
        void invalidate();
        // Try to score immediately; if the model isn't configured it stays unscored.
        score.mutate({ leadId: lead.id });
      },
      onError: (e) => toast?.toast({ message: e.message, variant: "error" }),
    })
  );
  const dismiss = useMutation(trpc.sourcing.dismissLead.mutationOptions({ onSuccess: invalidate }));
  const snooze = useMutation(trpc.sourcing.snoozeLead.mutationOptions({ onSuccess: invalidate }));
  const promote = useMutation(
    trpc.sourcing.promoteLead.mutationOptions({
      onSuccess: () => {
        void invalidate();
        void queryClient.invalidateQueries(trpc.projects.list.pathFilter());
        toast?.toast({ message: "Promoted to a prospect project." });
      },
      onError: (e) => toast?.toast({ message: e.message, variant: "error" }),
    })
  );

  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [dismissOpenFor, setDismissOpenFor] = useState<string | null>(null);

  function submitAdd() {
    if (!company.trim()) return;
    add.mutate({ companyName: company.trim(), notes: notes.trim() || undefined });
    setCompany("");
    setNotes("");
  }

  function handleDismiss(leadId: string, reason: string) {
    setDismissOpenFor(null);
    // Bad timing snoozes (3 weeks) rather than excluding — the deal may come back.
    if (reason === "bad_timing") {
      const until = new Date();
      until.setDate(until.getDate() + 21);
      snooze.mutate({ leadId, until });
    } else {
      dismiss.mutate({ leadId, reason: reason as never });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Add a prospect by hand */}
      <div className="flex flex-col gap-2 rounded-card border border-subtle bg-surface p-3">
        <div className="flex items-center gap-2">
          <Input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company name"
            aria-label="Company name"
            className="flex-1 text-sm"
          />
          <Button type="button" onClick={submitAdd} disabled={!company.trim() || add.isPending}>
            Add prospect
          </Button>
        </div>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What you know (industry, size, signals) — the agent scores what it's given"
          aria-label="Notes"
          className="text-sm"
        />
      </div>

      {leads.length === 0 ? (
        <p className="rounded-card border border-dashed border-subtle bg-surface p-4 text-sm text-ink-muted">
          No prospects yet. Add one above — or the weekly sourcing run will fill this (W10i).
        </p>
      ) : (
        leads.map((lead) => {
          const rationale = (lead.rationale ?? null) as LeadRationale | null;
          const scored = lead.score != null;
          return (
            <div
              key={lead.id}
              className="flex flex-col gap-3 rounded-card border border-subtle bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-caption tabular-nums text-ink-muted">#{lead.rank}</span>
                    <span className="truncate text-body font-medium text-ink">
                      {lead.companyName}
                    </span>
                    {lead.highPotentialUnverified ? (
                      <span className="rounded-pill bg-surface-2 px-2 py-0.5 text-caption text-ink-muted">
                        high potential · unverified
                      </span>
                    ) : null}
                  </div>
                  {lead.notes ? (
                    <p className="mt-0.5 text-caption text-ink-muted">{lead.notes}</p>
                  ) : null}
                </div>
                {scored ? (
                  <div className="shrink-0 text-right">
                    <div className="text-body font-medium tabular-nums text-ink">{lead.score}</div>
                    <div className="text-caption text-ink-muted">{lead.confidence}% sure</div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => score.mutate({ leadId: lead.id })}
                    disabled={score.isPending}
                    className="shrink-0 text-sm"
                  >
                    Score
                  </Button>
                )}
              </div>

              {scored && rationale ? (
                <div className="flex flex-col gap-1 border-t border-subtle pt-2">
                  {FACETS.map((f) => {
                    const facet = rationale[f];
                    if (!facet) return null;
                    return (
                      <div key={f} className="flex gap-2 text-caption">
                        <span className="w-16 shrink-0 capitalize text-ink-muted">{f}</span>
                        <span className="tabular-nums text-ink">{facet.score}</span>
                        <span className="min-w-0 text-ink-muted">{facet.reasons.join(" · ")}</span>
                      </div>
                    );
                  })}
                  {rationale.gaps && rationale.gaps.length ? (
                    <p className="mt-1 text-caption text-ink-muted">
                      Couldn&apos;t confirm: {rationale.gaps.join("; ")}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => promote.mutate({ leadId: lead.id })}
                  disabled={promote.isPending}
                  className="text-sm"
                >
                  Promote
                </Button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setDismissOpenFor(dismissOpenFor === lead.id ? null : lead.id)}
                    className="rounded-control border border-subtle px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:text-ink"
                  >
                    Dismiss
                  </button>
                  {dismissOpenFor === lead.id ? (
                    <div className="absolute z-20 mt-1 flex w-48 flex-col rounded-card border border-subtle bg-surface p-1 shadow-surface">
                      {DISMISS_OPTIONS.map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => handleDismiss(lead.id, o.value)}
                          className="rounded px-2 py-1.5 text-left text-sm text-ink transition hover:bg-surface-2"
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

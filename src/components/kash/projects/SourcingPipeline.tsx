"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

import Button from "@/components/kash/ui/Button";
import Input from "@/components/kash/ui/Input";
import { useOptionalToast } from "@/components/kash/ui/ToastProvider";
import { formatCents } from "@/lib/rates/format-cents";
import {
  CLOSED_LABELS,
  STAGE_LABELS,
  groupByStage,
  isClosedStage,
  nextStage,
  previousStage,
  stageTakesProposal,
  type PipelineStage,
} from "@/lib/sourcing/pipeline";
import type { CompanyFacts } from "@/lib/sourcing/research";
import type { LeadRationale } from "@/lib/sourcing/types";
import { useTRPC } from "@/trpc/client";

import LeadOutreachPanel from "./LeadOutreachPanel";
import LeadResearchBlock from "./LeadResearchBlock";
import SourcingRunStrip from "./SourcingRunStrip";

const DISMISS_OPTIONS: { value: string; label: string }[] = [
  { value: "wrong_industry", label: "Wrong industry" },
  { value: "too_small", label: "Too small" },
  { value: "too_big", label: "Too big" },
  { value: "bad_timing", label: "Bad timing" },
  { value: "already_know", label: "Already know them" },
  { value: "not_interested", label: "Not interested" },
];

const FACETS = ["fit", "risk", "strategy"] as const;

/** "$40,000" / "40000" / "40k" → cents. Null when there's no number in there. */
function parseAmountToCents(text: string): number | null {
  const cleaned = text
    .trim()
    .toLowerCase()
    .replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const k = cleaned.endsWith("k");
  const value = Number.parseFloat(k ? cleaned.slice(0, -1) : cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * (k ? 1000 : 1) * 100);
}

/**
 * The deal pipeline (W10d triage + W10f stages) — the gated Pipeline view on
 * Projects. Not a sixth surface: prospects are projects-in-waiting, so they live
 * where projects live.
 *
 * The board is grouped by stage rather than laid out in columns because a card
 * carries real substance — the score rationale, the gaps, the outreach drafts — and
 * none of that survives a 256px column. Stages read down the page, each with its
 * count; a deal moves with the ‹ › controls on its card.
 *
 * Money on this surface comes from a separate query (`listProposals`, financial) and
 * is joined to the cards by project id — the lead rows themselves carry no amount.
 */
export default function SourcingPipeline() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const toast = useOptionalToast();

  const { data: leads = [] } = useQuery(trpc.sourcing.listLeads.queryOptions());
  const { data: closed = [] } = useQuery(trpc.sourcing.listClosed.queryOptions({ limit: 20 }));
  const { data: proposals = [] } = useQuery(trpc.sourcing.listProposals.queryOptions());

  const proposalByProject = useMemo(
    () => new Map(proposals.map((p) => [p.projectId, p.proposalAmountCents])),
    [proposals]
  );

  const invalidate = () => {
    void queryClient.invalidateQueries(trpc.sourcing.listLeads.pathFilter());
    void queryClient.invalidateQueries(trpc.sourcing.listClosed.pathFilter());
  };

  const score = useMutation(
    trpc.sourcing.scoreLead.mutationOptions({
      onSuccess: invalidate,
      onError: (e: { message: string }) => toast?.toast({ message: e.message, variant: "error" }),
    })
  );
  const research = useMutation(
    trpc.sourcing.researchLead.mutationOptions({
      onSuccess: invalidate,
      onError: (e: { message: string }) => toast?.toast({ message: e.message, variant: "error" }),
    })
  );
  const add = useMutation(
    trpc.sourcing.addLead.mutationOptions({
      onSuccess: (lead: { id: string }) => {
        invalidate();
        // Try to score immediately; if the model isn't configured it stays unscored.
        score.mutate({ leadId: lead.id });
      },
      onError: (e: { message: string }) => toast?.toast({ message: e.message, variant: "error" }),
    })
  );
  const setStage = useMutation(
    trpc.sourcing.setStage.mutationOptions({
      onSuccess: () => {
        invalidate();
        // Signing creates a client and activates the project; declining archives it.
        void queryClient.invalidateQueries(trpc.projects.list.pathFilter());
      },
      onError: (e: { message: string }) => toast?.toast({ message: e.message, variant: "error" }),
    })
  );
  const setProposalAmount = useMutation(
    trpc.sourcing.setProposalAmount.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries(trpc.sourcing.listProposals.pathFilter()),
      onError: (e: { message: string }) => toast?.toast({ message: e.message, variant: "error" }),
    })
  );
  const dismiss = useMutation(trpc.sourcing.dismissLead.mutationOptions({ onSuccess: invalidate }));
  const snooze = useMutation(trpc.sourcing.snoozeLead.mutationOptions({ onSuccess: invalidate }));

  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [dismissOpenFor, setDismissOpenFor] = useState<string | null>(null);
  const [outreachOpenFor, setOutreachOpenFor] = useState<string | null>(null);
  const [amountDraft, setAmountDraft] = useState<Record<string, string>>({});
  const [showClosed, setShowClosed] = useState(false);

  const columns = useMemo(() => groupByStage(leads), [leads]);

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

  function commitAmount(leadId: string, projectId: string | null) {
    const raw = amountDraft[leadId];
    if (raw === undefined) return;
    const cents = parseAmountToCents(raw);
    if (raw.trim() && cents === null) {
      toast?.toast({ message: "That doesn't read as an amount.", variant: "error" });
      return;
    }
    setProposalAmount.mutate({ leadId, amountCents: raw.trim() ? cents : null });
    setAmountDraft((d) => {
      const next = { ...d };
      delete next[leadId];
      return next;
    });
    void projectId;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* What the weekly agent is doing, and what it has spent. */}
      <SourcingRunStrip />

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

      {/* The funnel: one section per open stage, always all four. */}
      {columns.map((column) => (
        <section key={column.stage} className="flex flex-col gap-3">
          <div className="flex items-baseline gap-2">
            <h2 className="text-sm font-medium text-ink">{column.label}</h2>
            <span className="text-caption tabular-nums text-ink-muted">{column.leads.length}</span>
          </div>

          {column.leads.length === 0 ? (
            <p className="rounded-card border border-dashed border-subtle bg-surface px-4 py-3 text-caption text-ink-muted">
              {column.stage === "new"
                ? "Nothing sourced. Add one above — or the weekly run will fill this (W10i)."
                : `Nothing at ${column.label.toLowerCase()}.`}
            </p>
          ) : (
            column.leads.map((lead) => {
              const rationale = (lead.rationale ?? null) as LeadRationale | null;
              const researched = (lead.research ?? null) as CompanyFacts | null;
              const scored = lead.score != null;
              const stage = lead.state as PipelineStage;
              const forward = nextStage(stage);
              const back = previousStage(stage);
              const amountCents = lead.projectId
                ? (proposalByProject.get(lead.projectId) ?? null)
                : null;

              return (
                <div
                  key={lead.id}
                  className="flex flex-col gap-3 rounded-card border border-subtle bg-surface p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-caption tabular-nums text-ink-muted">
                          #{lead.rank}
                        </span>
                        <span className="truncate text-body font-medium text-ink">
                          {lead.companyName}
                        </span>
                        {lead.highPotentialUnverified ? (
                          <span className="rounded-pill bg-surface-2 px-2 py-0.5 text-caption text-ink-muted">
                            high potential · unverified
                          </span>
                        ) : null}
                        {lead.projectId ? (
                          <Link
                            href={`/projects/${lead.projectId}`}
                            className="text-caption text-ink-muted underline-offset-2 hover:underline"
                          >
                            project →
                          </Link>
                        ) : null}
                      </div>
                      {lead.notes ? (
                        <p className="mt-0.5 text-caption text-ink-muted">{lead.notes}</p>
                      ) : null}
                    </div>
                    {scored ? (
                      <div className="shrink-0 text-right">
                        <div className="text-body font-medium tabular-nums text-ink">
                          {lead.score}
                        </div>
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
                            <span className="min-w-0 text-ink-muted">
                              {facet.reasons.join(" · ")}
                            </span>
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

                  {researched ? (
                    <LeadResearchBlock facts={researched} researchedAt={lead.researchedAt} />
                  ) : null}

                  {/* The quoted figure — financial-class, joined in by project id. */}
                  {stageTakesProposal(stage) ? (
                    <div className="flex items-center gap-2 border-t border-subtle pt-2">
                      <span className="text-caption text-ink-muted">Proposal</span>
                      <Input
                        value={
                          amountDraft[lead.id] ??
                          (amountCents != null ? `${amountCents / 100}` : "")
                        }
                        onChange={(e) =>
                          setAmountDraft((d) => ({ ...d, [lead.id]: e.target.value }))
                        }
                        onBlur={() => commitAmount(lead.id, lead.projectId)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitAmount(lead.id, lead.projectId);
                        }}
                        placeholder="$40,000"
                        aria-label={`Proposal amount for ${lead.companyName}`}
                        className="w-32 text-sm"
                      />
                      {amountCents != null && amountDraft[lead.id] === undefined ? (
                        <span className="text-caption tabular-nums text-ink-muted">
                          {formatCents(amountCents)}
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => research.mutate({ leadId: lead.id })}
                      disabled={research.isPending}
                      className="text-sm"
                      title="Reads the open web. About 8¢."
                    >
                      {research.isPending && research.variables?.leadId === lead.id
                        ? "Researching…"
                        : researched
                          ? "Re-research"
                          : "Research"}
                    </Button>
                    {back ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setStage.mutate({ leadId: lead.id, stage: back })}
                        disabled={setStage.isPending}
                        className="text-sm"
                        aria-label={`Move ${lead.companyName} back to ${STAGE_LABELS[back]}`}
                      >
                        ‹ {STAGE_LABELS[back]}
                      </Button>
                    ) : null}
                    {forward ? (
                      <Button
                        type="button"
                        onClick={() => setStage.mutate({ leadId: lead.id, stage: forward })}
                        disabled={setStage.isPending}
                        className="text-sm"
                      >
                        {STAGE_LABELS[forward]} ›
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setOutreachOpenFor(outreachOpenFor === lead.id ? null : lead.id)
                      }
                      className="text-sm"
                    >
                      {outreachOpenFor === lead.id ? "Hide outreach" : "Outreach"}
                    </Button>

                    {/* Closing a live deal is different from triaging a cold one. */}
                    {stage === "new" ? (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setDismissOpenFor(dismissOpenFor === lead.id ? null : lead.id)
                          }
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
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setStage.mutate({ leadId: lead.id, stage: "declined" })}
                          className="rounded-control border border-subtle px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:text-ink"
                        >
                          Declined
                        </button>
                        <button
                          type="button"
                          onClick={() => setStage.mutate({ leadId: lead.id, stage: "lost" })}
                          className="rounded-control border border-subtle px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:text-ink"
                        >
                          Lost
                        </button>
                      </>
                    )}
                  </div>

                  {outreachOpenFor === lead.id ? <LeadOutreachPanel leadId={lead.id} /> : null}
                </div>
              );
            })
          )}
        </section>
      ))}

      {/* What happened — signed, declined, lost. Folded away by default. */}
      {closed.length > 0 ? (
        <section className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowClosed((v) => !v)}
            className="self-start text-sm font-medium text-ink-muted transition hover:text-ink"
            aria-expanded={showClosed}
          >
            Closed · {closed.length} {showClosed ? "⌄" : "›"}
          </button>
          {showClosed
            ? closed.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between gap-3 rounded-card border border-subtle bg-surface px-4 py-2"
                >
                  <span className="truncate text-sm text-ink">{lead.companyName}</span>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-caption text-ink-muted">
                      {isClosedStage(lead.state) ? CLOSED_LABELS[lead.state] : lead.state}
                    </span>
                    <button
                      type="button"
                      onClick={() => setStage.mutate({ leadId: lead.id, stage: "engaged" })}
                      className="text-caption text-ink-muted underline-offset-2 transition hover:text-ink hover:underline"
                    >
                      Reopen
                    </button>
                  </div>
                </div>
              ))
            : null}
        </section>
      ) : null}
    </div>
  );
}

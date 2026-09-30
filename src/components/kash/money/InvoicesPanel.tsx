"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import Button from "@/components/kash/ui/Button";
import { Check, Copy, Download, Loader2, Undo2 } from "@/components/kash/ui/icon";
import {
  invoiceToCsv,
  invoiceToMarkdown,
  type InvoiceLineView,
  type InvoiceView,
} from "@/lib/invoice/format-invoice";
import { useTRPC } from "@/trpc/client";

const SECONDS_PER_HOUR = 3600;

function hoursLabel(seconds: number): string {
  return `${(seconds / SECONDS_PER_HOUR).toFixed(2)}h`;
}
function money(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** One editable draft line held in local state while the user reviews. */
type EditableLine = {
  label: string;
  description: string;
  hours: number;
  billedSeconds: number;
  amountCents: number;
  sortOrder: number;
  isAdditional: boolean;
};

type DraftState = {
  clientId: string;
  clientName: string;
  invoiceNumber: number;
  rateCents: number;
  periodStart: Date;
  periodEnd: Date;
  carriedSeconds: number;
  atThreshold: boolean;
  taxReserveCents: number | null;
  taxReservePercentBps: number | null;
  billedEntryIds: string[];
  lines: EditableLine[];
};

/** A lump-sum (fee) invoice being reviewed: amounts are fixed, wording is yours. */
type FeeDraftState = {
  clientId: string;
  clientName: string;
  lines: {
    installmentId: string;
    projectName: string;
    label: string;
    description: string;
    amountCents: number;
  }[];
};

function shortDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function copyText(text: string) {
  void navigator.clipboard?.writeText(text);
}

function downloadFile(name: string, contents: string, mime: string) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * The Money surface's invoicing section (W4). "Ready to bill" surfaces clients over
 * (and under) their threshold; drafting produces a reviewable, editable invoice you
 * sign, which exports to Markdown + CSV. Flowstate drafts, you sign — it never sends
 * anything (product law 1).
 */
export default function InvoicesPanel() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: ready } = useQuery(trpc.invoices.readyToBill.queryOptions());
  const { data: history } = useQuery(trpc.invoices.list.queryOptions({}));
  const { data: feeReady } = useQuery(trpc.feeInstallments.readyByClient.queryOptions());

  const [draft, setDraft] = useState<DraftState | null>(null);
  const [feeDraft, setFeeDraft] = useState<FeeDraftState | null>(null);

  /** Everything an invoice write can move: the lists, installments, and cash. */
  async function invalidateMoney() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.invoices.readyToBill.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.invoices.list.queryKey() }),
      queryClient.invalidateQueries(trpc.feeInstallments.pathFilter()),
      queryClient.invalidateQueries({ queryKey: trpc.money.drawPanel.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.money.kashTable.queryKey() }),
    ]);
  }

  const draftMutation = useMutation(
    trpc.invoices.draft.mutationOptions({
      onSuccess: (data) =>
        setDraft({
          clientId: data.clientId,
          clientName: data.clientName,
          invoiceNumber: data.invoiceNumber,
          rateCents: data.rateCents,
          periodStart: data.periodStart,
          periodEnd: data.periodEnd,
          carriedSeconds: data.carriedSeconds,
          atThreshold: data.atThreshold,
          taxReserveCents: data.taxReserveCents,
          taxReservePercentBps: data.taxReservePercentBps,
          billedEntryIds: data.billedEntryIds,
          lines: data.lines.map((l) => ({ ...l, hours: l.billedSeconds / SECONDS_PER_HOUR })),
        }),
    })
  );

  const acceptMutation = useMutation(
    trpc.invoices.accept.mutationOptions({
      onSuccess: async (_res, variables) => {
        setDraft(null);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: trpc.invoices.readyToBill.queryKey() }),
          queryClient.invalidateQueries({ queryKey: trpc.invoices.list.queryKey() }),
          queryClient.invalidateQueries({ queryKey: trpc.money.kashTable.queryKey() }),
        ]);
        void variables;
      },
    })
  );

  const voidMutation = useMutation(
    trpc.invoices.void.mutationOptions({ onSuccess: invalidateMoney })
  );

  const acceptFeeMutation = useMutation(
    trpc.invoices.acceptFee.mutationOptions({
      onSuccess: async () => {
        setFeeDraft(null);
        await invalidateMoney();
      },
    })
  );

  // Recording a payment is a fact you enter, not something Flowstate sends (law 1).
  const markPaidMutation = useMutation(
    trpc.invoices.markPaid.mutationOptions({ onSuccess: invalidateMoney })
  );
  const markUnpaidMutation = useMutation(
    trpc.invoices.markUnpaid.mutationOptions({ onSuccess: invalidateMoney })
  );

  function startFeeDraft(clientId: string) {
    const group = feeReady?.find((g) => g.clientId === clientId);
    if (!group) return;
    setDraft(null);
    setFeeDraft({
      clientId: group.clientId,
      clientName: group.clientName,
      lines: group.installments.map((i) => ({
        installmentId: i.id,
        projectName: i.projectName,
        label: i.label,
        description: "",
        amountCents: i.amountCents,
      })),
    });
  }

  function acceptFeeDraft() {
    if (!feeDraft) return;
    acceptFeeMutation.mutate({
      clientId: feeDraft.clientId,
      lines: feeDraft.lines.map((l) => ({
        installmentId: l.installmentId,
        label: l.label,
        description: l.description,
      })),
    });
  }

  // Preview total: quarter-hour round each edited line, then price it. The server
  // recomputes this authoritatively on accept — this is just what the user sees.
  const draftAmountCents = draft
    ? draft.lines.reduce((sum, l) => {
        const quarterHours = Math.round(l.hours * 4) / 4;
        return sum + Math.round(quarterHours * draft.rateCents);
      }, 0)
    : 0;

  function updateLine(index: number, patch: Partial<EditableLine>) {
    setDraft((prev) =>
      prev
        ? { ...prev, lines: prev.lines.map((l, i) => (i === index ? { ...l, ...patch } : l)) }
        : prev
    );
  }

  function acceptDraft() {
    if (!draft) return;
    acceptMutation.mutate({
      clientId: draft.clientId,
      billedEntryIds: draft.billedEntryIds,
      periodStart: draft.periodStart,
      periodEnd: draft.periodEnd,
      lines: draft.lines.map((l) => ({
        label: l.label,
        description: l.description,
        billedSeconds: Math.round(l.hours * SECONDS_PER_HOUR),
        sortOrder: l.sortOrder,
        isAdditional: l.isAdditional,
      })),
    });
  }

  async function exportInvoice(invoiceId: string, kind: "md" | "csv") {
    const inv = await queryClient.fetchQuery(trpc.invoices.getById.queryOptions({ id: invoiceId }));
    const view: InvoiceView = {
      kind: inv.kind === "fee" ? "fee" : "time",
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.clientName,
      periodStart: inv.periodStart,
      periodEnd: inv.periodEnd,
      issuedAt: inv.createdAt,
      rateCents: inv.rateCents,
      billedSeconds: inv.billedSeconds,
      carriedSeconds: inv.carriedSeconds,
      amountCents: inv.amountCents,
      lines: inv.lines as InvoiceLineView[],
    };
    if (kind === "md") copyText(invoiceToMarkdown(view));
    else
      downloadFile(
        `invoice-${inv.clientName}-${inv.invoiceNumber}.csv`,
        invoiceToCsv(view),
        "text/csv;charset=utf-8"
      );
  }

  return (
    <section className="flex flex-col gap-4">
      {/* Ready to bill */}
      {ready && ready.length > 0 && (
        <div className="flex flex-col gap-2">
          {ready.map((client) => (
            <div
              key={client.clientId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-surface px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-ink">{client.name}</p>
                <p className="text-caption text-ink-muted">
                  {hoursLabel(client.unbilledSeconds)} unbilled · threshold {client.thresholdHours}h
                  {client.atThreshold ? (
                    <span className="ml-2 font-semibold text-ink">ready</span>
                  ) : null}
                </p>
              </div>
              <button
                type="button"
                onClick={() => draftMutation.mutate({ clientId: client.clientId })}
                disabled={draftMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-pill border border-subtle bg-surface px-3 py-1 text-xs font-medium text-ink transition hover:text-accent disabled:opacity-50"
              >
                {draftMutation.isPending &&
                draftMutation.variables?.clientId === client.clientId ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : null}
                Draft invoice
              </button>
            </div>
          ))}
        </div>
      )}

      {ready && ready.length === 0 && !draft && !feeDraft && (feeReady?.length ?? 0) === 0 ? (
        <p className="rounded-card bg-surface p-5 text-sm text-ink-muted">
          Nothing to bill yet — billable time shows up here as it accrues.
        </p>
      ) : null}

      {draftMutation.isError ? (
        <p className="text-caption text-critical">{draftMutation.error.message}</p>
      ) : null}

      {/* Draft editor */}
      {draft ? (
        <div className="flex flex-col gap-3 rounded-card border border-control-border bg-surface p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-ink">
              Invoice #{draft.invoiceNumber} — {draft.clientName}
            </h3>
            <span className="text-caption text-ink-muted">
              {money(draft.rateCents)}/hr · {draft.periodStart.toISOString().slice(0, 10)} –{" "}
              {draft.periodEnd.toISOString().slice(0, 10)}
            </span>
          </div>

          {!draft.atThreshold ? (
            <p className="rounded-control bg-surface-2 px-3 py-2 text-caption text-ink-muted">
              Below the threshold — you can still bill a short invoice, or wait for more hours.
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            {draft.lines.map((line, index) => (
              <div key={index} className="flex flex-col gap-1.5 rounded-control bg-surface-2 p-3">
                <div className="flex items-center gap-2">
                  <input
                    value={line.label}
                    onChange={(e) => updateLine(index, { label: e.target.value })}
                    className="flex-1 rounded-control border border-subtle bg-surface px-2 py-1 text-sm text-ink"
                    aria-label="Line label"
                  />
                  <input
                    type="number"
                    step={0.25}
                    min={0}
                    value={line.hours}
                    onChange={(e) => updateLine(index, { hours: Number(e.target.value) })}
                    className="w-20 rounded-control border border-subtle bg-surface px-2 py-1 text-right text-sm tabular-nums text-ink"
                    aria-label="Line hours"
                  />
                  <span className="w-8 text-caption text-ink-muted">h</span>
                </div>
                <textarea
                  value={line.description}
                  onChange={(e) => updateLine(index, { description: e.target.value })}
                  placeholder="What was delivered…"
                  rows={2}
                  className="w-full resize-y rounded-control border border-subtle bg-surface px-2 py-1 text-caption text-ink-muted"
                  aria-label="Line description"
                />
              </div>
            ))}
          </div>

          <dl className="flex flex-col gap-1 text-caption text-ink-muted">
            <div className="flex justify-between">
              <dt>Billed this invoice</dt>
              <dd className="tabular-nums text-ink">{money(draftAmountCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Carried to next invoice</dt>
              <dd className="tabular-nums">{hoursLabel(draft.carriedSeconds)}</dd>
            </div>
            {draft.taxReserveCents != null ? (
              <div className="flex justify-between">
                <dt>Set aside for tax ({(draft.taxReservePercentBps! / 100).toFixed(0)}%)</dt>
                <dd className="tabular-nums">{money(draft.taxReserveCents)}</dd>
              </div>
            ) : null}
          </dl>

          {acceptMutation.isError ? (
            <p className="text-caption text-critical">{acceptMutation.error.message}</p>
          ) : null}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={acceptDraft}
              disabled={acceptMutation.isPending || draft.lines.length === 0}
              className="px-4 py-1.5 text-xs"
            >
              {acceptMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
              Accept & mark billed
            </Button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="rounded-pill border border-subtle bg-surface px-3 py-1.5 text-xs text-ink-muted transition hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {/* Lump sums ready — fixed-fee installments bill on their own fee invoice. */}
      {feeReady && feeReady.length > 0 && !feeDraft ? (
        <div className="flex flex-col gap-2">
          {feeReady.map((group) => (
            <div
              key={group.clientId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-surface px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-ink">{group.clientName}</p>
                <p className="text-caption text-ink-muted">
                  {group.installments.length === 1
                    ? "1 lump sum"
                    : `${group.installments.length} lump sums`}{" "}
                  billable · <span className="tabular-nums">{money(group.totalCents)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => startFeeDraft(group.clientId)}
                className="inline-flex items-center gap-1.5 rounded-pill border border-subtle bg-surface px-3 py-1 text-xs font-medium text-ink transition hover:text-accent"
              >
                Draft fee invoice
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {feeDraft ? (
        <div className="flex flex-col gap-3 rounded-card border border-control-border bg-surface p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-ink">Fee invoice — {feeDraft.clientName}</h3>
            <span className="text-caption text-ink-muted">Lump sum · no hours</span>
          </div>
          <div className="flex flex-col gap-2">
            {feeDraft.lines.map((line, index) => (
              <div
                key={line.installmentId}
                className="flex flex-col gap-1.5 rounded-control bg-surface-2 p-3"
              >
                <div className="flex items-center gap-2">
                  <input
                    value={line.label}
                    onChange={(e) =>
                      setFeeDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              lines: prev.lines.map((l, i) =>
                                i === index ? { ...l, label: e.target.value } : l
                              ),
                            }
                          : prev
                      )
                    }
                    className="flex-1 rounded-control border border-subtle bg-surface px-2 py-1 text-sm text-ink"
                    aria-label="Line label"
                  />
                  <span className="text-sm tabular-nums text-ink">{money(line.amountCents)}</span>
                </div>
                <p className="text-caption text-ink-muted">{line.projectName}</p>
                <textarea
                  value={line.description}
                  onChange={(e) =>
                    setFeeDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            lines: prev.lines.map((l, i) =>
                              i === index ? { ...l, description: e.target.value } : l
                            ),
                          }
                        : prev
                    )
                  }
                  placeholder="What was delivered…"
                  rows={2}
                  className="w-full resize-y rounded-control border border-subtle bg-surface px-2 py-1 text-caption text-ink-muted"
                  aria-label="Line description"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-caption text-ink-muted">
            <span>Billed this invoice</span>
            <span className="tabular-nums text-ink">
              {money(feeDraft.lines.reduce((sum, l) => sum + l.amountCents, 0))}
            </span>
          </div>
          {acceptFeeMutation.isError ? (
            <p className="text-caption text-critical">{acceptFeeMutation.error.message}</p>
          ) : null}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={acceptFeeDraft}
              disabled={acceptFeeMutation.isPending || feeDraft.lines.some((l) => !l.label.trim())}
              className="px-4 py-1.5 text-xs"
            >
              {acceptFeeMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
              Accept & mark billed
            </Button>
            <button
              type="button"
              onClick={() => setFeeDraft(null)}
              className="rounded-pill border border-subtle bg-surface px-3 py-1.5 text-xs text-ink-muted transition hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {/* History */}
      {history && history.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-caption font-medium uppercase tracking-wide text-ink-muted">
            History
          </h3>
          {history.map((inv) => (
            <div
              key={inv.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-card bg-surface px-4 py-2.5 ${
                inv.status === "void" ? "opacity-60" : ""
              }`}
            >
              <div>
                <p className="text-sm text-ink">
                  #{inv.invoiceNumber} · {inv.clientName}
                  {inv.status === "void" ? (
                    <span className="ml-2 text-caption text-ink-muted">void</span>
                  ) : inv.paidAt ? (
                    <span className="ml-2 text-caption text-ink-muted">
                      paid {shortDate(inv.paidAt)}
                    </span>
                  ) : (
                    <span className="ml-2 text-caption font-medium text-unpaid">unpaid</span>
                  )}
                </p>
                <p className="text-caption text-ink-muted">
                  {inv.kind === "fee" ? (
                    <>Lump sum · issued {inv.createdAt.toISOString().slice(0, 10)} · </>
                  ) : (
                    <>
                      {inv.periodStart.toISOString().slice(0, 10)} –{" "}
                      {inv.periodEnd.toISOString().slice(0, 10)} · {hoursLabel(inv.billedSeconds)}{" "}
                      ·{" "}
                    </>
                  )}
                  {money(inv.amountCents)}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {inv.status !== "void" ? (
                  inv.paidAt ? (
                    <button
                      type="button"
                      onClick={() => markUnpaidMutation.mutate({ invoiceId: inv.id })}
                      disabled={markUnpaidMutation.isPending}
                      title="Undo — record this invoice as not yet paid"
                      className="inline-flex items-center gap-1 rounded-pill border border-subtle px-2.5 py-1 text-caption text-ink-muted transition hover:text-ink disabled:opacity-50"
                    >
                      <Undo2 size={13} /> Unpaid
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => markPaidMutation.mutate({ invoiceId: inv.id })}
                      disabled={markPaidMutation.isPending}
                      title="Record that the client paid (today)"
                      className="inline-flex items-center gap-1 rounded-pill border border-subtle px-2.5 py-1 text-caption font-medium text-ink transition hover:bg-tint-hover disabled:opacity-50"
                    >
                      <Check size={13} /> Mark paid
                    </button>
                  )
                ) : null}
                <button
                  type="button"
                  onClick={() => void exportInvoice(inv.id, "md")}
                  title="Copy invoice as Markdown"
                  className="inline-flex items-center gap-1 rounded-pill border border-subtle px-2.5 py-1 text-caption text-ink-muted transition hover:text-ink"
                >
                  <Copy size={13} /> Copy
                </button>
                <button
                  type="button"
                  onClick={() => void exportInvoice(inv.id, "csv")}
                  title="Download line items as CSV"
                  className="inline-flex items-center gap-1 rounded-pill border border-subtle px-2.5 py-1 text-caption text-ink-muted transition hover:text-ink"
                >
                  <Download size={13} /> CSV
                </button>
                {inv.status !== "void" ? (
                  <button
                    type="button"
                    onClick={() => voidMutation.mutate({ invoiceId: inv.id })}
                    disabled={voidMutation.isPending}
                    title="Un-accept — release entries to bill again"
                    className="inline-flex items-center gap-1 rounded-pill border border-subtle px-2.5 py-1 text-caption text-ink-muted transition hover:text-critical disabled:opacity-50"
                  >
                    <Undo2 size={13} /> Void
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

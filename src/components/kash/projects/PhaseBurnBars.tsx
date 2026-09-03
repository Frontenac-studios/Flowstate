"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import Select from "@/components/kash/ui/Select";
import { useOptionalToast } from "@/components/kash/ui/ToastProvider";
import { formatCents } from "@/lib/rates/format-cents";
import { useTRPC } from "@/trpc/client";

/**
 * W15 — estimate vs actual on project detail: a burn bar per phase (discovery 4.6).
 *
 * The bar shows TWO quantities on one track — budget consumed as the fill, work
 * completed as a marker — because the signal is the gap between them, and putting
 * them on separate bars makes the reader do the subtraction. A phase is only red
 * when the budget has run far enough ahead of the work to mean something (see
 * OFF_TRACK_MARGIN_PCT); an unestimated phase is grey, never green, because nobody
 * measured it.
 */
function Bar({
  consumedPct,
  completedPct,
  hot,
}: {
  consumedPct: number | null;
  completedPct: number;
  hot: boolean;
}) {
  if (consumedPct === null) {
    return (
      <div className="h-1.5 w-full rounded-pill bg-surface-2" aria-hidden>
        <div className="h-full w-full rounded-pill border border-dashed border-subtle" />
      </div>
    );
  }

  return (
    <div className="relative h-1.5 w-full overflow-visible rounded-pill bg-surface-2" aria-hidden>
      <div
        className={`h-full rounded-pill ${hot ? "bg-critical" : "bg-ink"}`}
        style={{ width: `${Math.min(100, consumedPct)}%` }}
      />
      {/* Where the work actually is — the thing the fill is being judged against. */}
      <div
        className="absolute top-[-2px] h-[10px] w-px bg-ink-muted"
        style={{ left: `${Math.min(100, completedPct)}%` }}
      />
    </div>
  );
}

export default function PhaseBurnBars({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const toast = useOptionalToast();

  const { data = [] } = useQuery(trpc.projects.burn.queryOptions({ projectId }));
  const { data: fee } = useQuery(trpc.projects.getFee.queryOptions({ projectId }));
  const [draft, setDraft] = useState<Record<string, string>>({});

  const setBillingType = useMutation(
    trpc.projects.setBillingType.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.projects.burn.pathFilter());
        void queryClient.invalidateQueries(trpc.projects.list.pathFilter());
      },
      onError: (e: { message: string }) => toast?.toast({ message: e.message, variant: "error" }),
    })
  );
  const setFee = useMutation(
    trpc.projects.setFee.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.projects.burn.pathFilter());
        void queryClient.invalidateQueries(trpc.projects.getFee.pathFilter());
      },
      onError: (e: { message: string }) => toast?.toast({ message: e.message, variant: "error" }),
    })
  );
  const setEstimate = useMutation(
    trpc.phases.setEstimate.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.projects.burn.pathFilter());
        void queryClient.invalidateQueries(trpc.phases.listByProject.pathFilter());
      },
      onError: (e: { message: string }) => toast?.toast({ message: e.message, variant: "error" }),
    })
  );

  const read = data[0];
  if (!read) return null;

  const { burn, billingType, message } = read;

  /** "$5,000" / "5000" → cents. Null when the field is cleared. */
  function toCents(text: string): number | null | undefined {
    const cleaned = text.trim().replace(/[$,\s]/g, "");
    if (!cleaned) return null;
    const value = Number.parseFloat(cleaned);
    if (!Number.isFinite(value) || value < 0) return undefined;
    return Math.round(value * 100);
  }

  function commitFee(field: "fee" | "floor", text: string) {
    const cents = toCents(text);
    if (cents === undefined) {
      toast?.toast({ message: "That doesn't read as an amount.", variant: "error" });
      return;
    }
    setFee.mutate({
      projectId,
      feeAmountCents: field === "fee" ? cents : (fee?.feeAmountCents ?? null),
      targetRateFloorCents: field === "floor" ? cents : (fee?.targetRateFloorCents ?? null),
    });
  }

  function commit(phaseId: string) {
    const raw = draft[phaseId];
    if (raw === undefined) return;
    const trimmed = raw.trim();
    const parsed = trimmed === "" ? null : Number.parseInt(trimmed, 10);
    if (trimmed !== "" && (!Number.isFinite(parsed) || (parsed ?? 0) < 0)) {
      toast?.toast({ message: "Estimates are whole hours.", variant: "error" });
      return;
    }
    setEstimate.mutate({ id: phaseId, estimateHours: parsed });
    setDraft((d) => {
      const next = { ...d };
      delete next[phaseId];
      return next;
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-card border border-subtle bg-surface p-4 shadow-surface">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-body font-medium text-ink">Plan vs actual</h2>
        <span className="text-caption text-ink-muted">
          {burn.total.estimateHours != null
            ? `${burn.total.actualHours}h of ${burn.total.estimateHours}h · ${burn.total.completedPct}% done`
            : `${burn.total.actualHours}h logged · no estimate yet`}
        </span>
      </div>

      {/* How the work is sold — it decides what the burn MEANS, so it lives here. */}
      <div className="flex flex-wrap items-center gap-2 border-b border-subtle pb-3">
        <label className="flex items-center gap-2 text-caption text-ink-muted">
          Billed
          <Select
            value={billingType}
            aria-label="Billing type"
            onChange={(e) =>
              setBillingType.mutate({
                projectId,
                billingType: e.target.value as "hourly" | "fixed_fee",
              })
            }
            className="py-1 text-sm"
          >
            <option value="hourly">Hourly</option>
            <option value="fixed_fee">Fixed fee</option>
          </Select>
        </label>

        {billingType === "fixed_fee" ? (
          <>
            <label className="flex items-center gap-1.5 text-caption text-ink-muted">
              Fee
              <input
                defaultValue={fee?.feeAmountCents != null ? `${fee.feeAmountCents / 100}` : ""}
                onBlur={(e) => commitFee("fee", e.target.value)}
                placeholder="$5,000"
                aria-label="Fixed fee amount"
                className="w-24 rounded-control border border-subtle bg-surface px-2 py-1 text-sm text-ink"
              />
            </label>
            <label className="flex items-center gap-1.5 text-caption text-ink-muted">
              Rate floor
              <input
                defaultValue={
                  fee?.targetRateFloorCents != null ? `${fee.targetRateFloorCents / 100}` : ""
                }
                onBlur={(e) => commitFee("floor", e.target.value)}
                placeholder="$80"
                aria-label="Target rate floor"
                title="The effective hourly rate below which this fee is losing money"
                className="w-20 rounded-control border border-subtle bg-surface px-2 py-1 text-sm text-ink"
              />
            </label>
          </>
        ) : null}
      </div>

      {message ? (
        <p className="rounded-control bg-surface-2 px-3 py-2 text-caption text-ink">{message}</p>
      ) : null}

      {billingType === "fixed_fee" && read.fee?.effectiveRateCents != null ? (
        <p className="text-caption text-ink-muted">
          Effective rate {formatCents(read.fee.effectiveRateCents)}/hr
          {read.fee.targetRateFloorCents != null
            ? ` against a ${formatCents(read.fee.targetRateFloorCents)} floor`
            : ""}
          {read.fee.hoursUntilFloor != null && !read.fee.belowFloor
            ? ` · ${read.fee.hoursUntilFloor}h of room left`
            : ""}
          .
        </p>
      ) : null}

      {burn.phases.length === 0 ? (
        <p className="text-caption text-ink-muted">
          No phases yet — a plan is phases with an hour estimate on each.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {burn.phases.map((phase) => (
            <li key={phase.phaseId} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-sm text-ink">{phase.phaseName}</span>
                <span className="flex shrink-0 items-center gap-1.5 text-caption text-ink-muted">
                  <span className="tabular-nums">{phase.burn.actualHours}h</span>
                  <span aria-hidden>/</span>
                  <input
                    value={draft[phase.phaseId] ?? phase.estimateHours ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, [phase.phaseId]: e.target.value }))}
                    onBlur={() => commit(phase.phaseId)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commit(phase.phaseId);
                    }}
                    placeholder="—"
                    aria-label={`Hour estimate for ${phase.phaseName}`}
                    className="w-10 rounded-control border border-subtle bg-surface px-1 py-0.5 text-right text-caption tabular-nums text-ink"
                  />
                  <span aria-hidden>h</span>
                </span>
              </div>
              <Bar
                consumedPct={phase.burn.consumedPct}
                completedPct={phase.burn.completedPct}
                hot={phase.burn.state === "hot"}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

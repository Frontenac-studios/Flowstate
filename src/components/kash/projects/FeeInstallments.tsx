"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import Button from "@/components/kash/ui/Button";
import IconButton from "@/components/kash/ui/IconButton";
import Input from "@/components/kash/ui/Input";
import Select from "@/components/kash/ui/Select";
import { useOptionalToast } from "@/components/kash/ui/ToastProvider";
import { Trash2 } from "@/components/kash/ui/icon";
import type { InstallmentStatus } from "@/lib/money/fee-installments";
import { formatCents } from "@/lib/rates/format-cents";
import { useTRPC } from "@/trpc/client";

/** "$2,000" / "2000" → cents; undefined when it doesn't read as a positive amount. */
function parseCents(text: string): number | undefined {
  const cleaned = text.trim().replace(/[$,\s]/g, "");
  const value = Number.parseFloat(cleaned);
  if (!cleaned || !Number.isFinite(value) || value <= 0) return undefined;
  return Math.round(value * 100);
}

const STATUS_LABEL: Record<InstallmentStatus, string> = {
  scheduled: "Scheduled",
  ready: "Billable",
  invoiced: "Invoiced",
  paid: "Paid",
};

/**
 * Lump-sum billing for a fixed-fee project (Spec v5 KashB2): the fee split into
 * installments. One becomes billable when its milestone is completed or when it's
 * marked ready here; billable installments are invoiced from Money on their own fee
 * invoice. A billed installment is frozen until that invoice is voided.
 */
export default function FeeInstallments({
  projectId,
  feeAmountCents,
}: {
  projectId: string;
  feeAmountCents: number | null;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const toast = useOptionalToast();

  const { data: installments = [] } = useQuery(
    trpc.feeInstallments.listByProject.queryOptions({ projectId })
  );
  const { data: milestones = [] } = useQuery(
    trpc.projectMilestones.listByProject.queryOptions({ projectId })
  );

  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [milestoneId, setMilestoneId] = useState("");

  const onError = (e: { message: string }) =>
    toast?.toast({ message: e.message, variant: "error" });
  const invalidate = () => {
    void queryClient.invalidateQueries(trpc.feeInstallments.pathFilter());
  };

  const create = useMutation(
    trpc.feeInstallments.create.mutationOptions({
      onSuccess: () => {
        setLabel("");
        setAmount("");
        setMilestoneId("");
        invalidate();
      },
      onError,
    })
  );
  const update = useMutation(
    trpc.feeInstallments.update.mutationOptions({ onSuccess: invalidate, onError })
  );
  const setReady = useMutation(
    trpc.feeInstallments.setReady.mutationOptions({ onSuccess: invalidate, onError })
  );
  const remove = useMutation(
    trpc.feeInstallments.delete.mutationOptions({ onSuccess: invalidate, onError })
  );

  const scheduledCents = installments.reduce((sum, i) => sum + i.amountCents, 0);
  const billableCents = installments
    .filter((i) => i.status === "ready")
    .reduce((sum, i) => sum + i.amountCents, 0);

  function submit(e: FormEvent) {
    e.preventDefault();
    const cents = parseCents(amount);
    if (!label.trim()) return;
    if (cents === undefined) {
      toast?.toast({ message: "That doesn't read as an amount.", variant: "error" });
      return;
    }
    create.mutate({
      projectId,
      label: label.trim(),
      amountCents: cents,
      milestoneId: milestoneId || null,
    });
  }

  return (
    <div className="flex flex-col gap-2 border-t border-subtle pt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">Installments</h3>
        <span className="text-caption tabular-nums text-ink-muted">
          {formatCents(scheduledCents)}
          {feeAmountCents != null ? ` of ${formatCents(feeAmountCents)}` : ""} scheduled
          {billableCents > 0 ? ` · ${formatCents(billableCents)} billable now` : ""}
        </span>
      </div>

      {installments.length > 0 ? (
        <ul className="flex flex-col">
          {installments.map((i) => {
            const billed = i.invoiceId != null;
            const milestoneReady = i.milestoneCompletedAt != null;
            return (
              <li
                key={i.id}
                className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3 border-b border-subtle last:border-b-0"
              >
                <span className="flex min-w-0 flex-col py-1.5">
                  <span className="truncate text-sm text-ink">{i.label}</span>
                  {!billed && milestones.length > 0 ? (
                    // The milestone line doubles as its editor: a borderless select.
                    <select
                      value={i.milestoneId ?? ""}
                      aria-label={`When ${i.label} becomes billable`}
                      onChange={(e) =>
                        update.mutate({ id: i.id, milestoneId: e.target.value || null })
                      }
                      className="kash-focus-visible -ml-0.5 w-fit max-w-full cursor-pointer truncate bg-transparent text-caption text-ink-muted outline-none hover:text-ink"
                    >
                      <option value="">When marked ready</option>
                      {milestones.map((m) => (
                        <option key={m.id} value={m.id}>
                          When {m.title} is done
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="truncate text-caption text-ink-muted">
                      {i.milestoneTitle ? `${i.milestoneTitle}` : "Marked ready"}
                      {billed && i.invoiceNumber != null ? ` · invoice #${i.invoiceNumber}` : ""}
                    </span>
                  )}
                </span>
                <span className="text-sm tabular-nums text-ink">{formatCents(i.amountCents)}</span>
                <span
                  className={`text-caption font-medium ${
                    i.status === "ready" ? "text-ink" : "text-ink-muted"
                  }`}
                >
                  {STATUS_LABEL[i.status]}
                </span>
                <span className="flex items-center justify-end gap-1">
                  {!billed && !milestoneReady ? (
                    <Button
                      variant="ghost"
                      className="text-caption"
                      disabled={setReady.isPending}
                      onClick={() => setReady.mutate({ id: i.id, ready: i.readyAt == null })}
                    >
                      {i.readyAt == null ? "Mark ready" : "Not ready"}
                    </Button>
                  ) : null}
                  {!billed ? (
                    <IconButton
                      aria-label={`Delete ${i.label}`}
                      disabled={remove.isPending}
                      onClick={() => remove.mutate({ id: i.id })}
                    >
                      <Trash2 size={15} />
                    </IconButton>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-caption text-ink-muted">
          Split the fee into the pieces you bill — each becomes billable when its milestone is done,
          or when you mark it ready.
        </p>
      )}

      <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Milestone 1 — discovery"
          aria-label="Installment label"
          className="h-9 min-w-0 flex-1 text-sm"
        />
        <Input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="$2,000"
          aria-label="Installment amount"
          inputMode="decimal"
          className="h-9 w-28 text-sm tabular-nums"
        />
        {milestones.length > 0 ? (
          <Select
            value={milestoneId}
            onChange={(e) => setMilestoneId(e.target.value)}
            aria-label="Billable when"
            className="h-9 py-0 text-sm"
          >
            <option value="">Marked ready</option>
            {milestones.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </Select>
        ) : null}
        <Button
          type="submit"
          variant="secondary"
          className="py-1.5 text-sm"
          disabled={create.isPending || !label.trim() || !amount.trim()}
        >
          Add
        </Button>
      </form>
    </div>
  );
}

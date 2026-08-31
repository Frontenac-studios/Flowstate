"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import ExpensesByCategoryChart from "@/components/kash/money/ExpensesByCategoryChart";
import XeroImport from "@/components/kash/money/XeroImport";
import { Plus, Trash2, Wallet } from "@/components/kash/ui/icon";
import { useTRPC } from "@/trpc/client";

function dollars(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${Math.abs(Math.round(cents / 100)).toLocaleString()}`;
}
function dollarsExact(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function months(n: number | null): string {
  return n == null ? "—" : `${n.toFixed(1)} mo`;
}
function centsFromInput(value: string): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * The Draw panel (W16) — a section of Money, no new surface. The one pipe between
 * the business and the person: what's collected, what it costs to run, what's been
 * drawn, and what's safe to take next. Flowstate holds these numbers; it never
 * manages personal spending (Tier 2 is never built).
 */
export default function DrawPanel() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: panel } = useQuery(trpc.money.drawPanel.queryOptions());
  const { data: settings } = useQuery(trpc.money.getSettings.queryOptions());
  const { data: expenses } = useQuery(trpc.money.listExpenses.queryOptions());
  const { data: draws } = useQuery(trpc.money.listDraws.queryOptions());
  const { data: byCategory } = useQuery(trpc.money.expensesByCategory.queryOptions());

  const invalidateAll = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.money.drawPanel.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.money.getSettings.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.money.listExpenses.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.money.listDraws.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.money.expensesByCategory.queryKey() }),
    ]);

  const updateSettings = useMutation(
    trpc.money.updateSettings.mutationOptions({ onSuccess: () => void invalidateAll() })
  );
  const addExpense = useMutation(
    trpc.money.addExpense.mutationOptions({ onSuccess: () => void invalidateAll() })
  );
  const deleteExpense = useMutation(
    trpc.money.deleteExpense.mutationOptions({ onSuccess: () => void invalidateAll() })
  );
  const addDraw = useMutation(
    trpc.money.addDraw.mutationOptions({ onSuccess: () => void invalidateAll() })
  );
  const deleteDraw = useMutation(
    trpc.money.deleteDraw.mutationOptions({ onSuccess: () => void invalidateAll() })
  );

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Wallet size={18} className="text-ink-muted" />
        <h2 className="text-body font-semibold text-ink">The draw</h2>
      </div>

      {/* Hero: available to draw */}
      <div className="rounded-card border border-border bg-surface p-5 shadow-surface">
        <p className="text-caption text-ink-muted">Available to draw</p>
        <p className="mt-1 text-title font-semibold tabular-nums text-ink">
          {panel ? dollars(panel.availableToDrawCents) : "—"}
        </p>
        {panel ? (
          <p className="mt-1 text-caption text-ink-faint">
            {dollars(panel.businessCashCents)} business cash
            {panel.taxReserveCents != null
              ? ` · less ${dollars(panel.taxReserveCents)} tax reserve`
              : ""}
          </p>
        ) : null}
        {panel?.belowMinimumDraw ? (
          <p className="mt-2 rounded-control bg-surface-2 px-3 py-1.5 text-caption text-critical">
            Below your minimum draw of {dollars(panel.minimumDrawCents ?? 0)}.
          </p>
        ) : null}
      </div>

      {/* Cash ledger */}
      {panel ? (
        <dl className="flex flex-col gap-1.5 rounded-card border border-subtle bg-surface px-4 py-3 text-sm">
          <LedgerRow
            label="Collected (paid invoices)"
            value={dollars(panel.collectedRevenueCents)}
            sign="+"
          />
          <LedgerRow label="Business expenses" value={dollars(panel.expensesCents)} sign="−" />
          <LedgerRow label="Owner draws" value={dollars(panel.drawsCents)} sign="−" />
          <div className="my-1 border-t border-subtle" />
          <LedgerRow label="Business cash" value={dollars(panel.businessCashCents)} strong />
          <p className="mt-1 text-caption text-ink-faint">
            {dollars(panel.billedUnpaidRevenueCents)} billed but not yet collected (incoming, not
            counted)
          </p>
        </dl>
      ) : null}

      {/* Runways */}
      {panel ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-card border border-border bg-surface p-4">
            <p className="text-caption text-ink-muted">Business runway</p>
            <p className="mt-1 text-title font-semibold tabular-nums text-ink">
              {months(panel.businessRunwayMonths)}
            </p>
            <p className="mt-1 text-caption text-ink-faint">business cash ÷ recent monthly burn</p>
          </div>
          <div className="rounded-card border border-border bg-surface p-4">
            <p className="text-caption text-ink-muted">Personal runway</p>
            <p className="mt-1 text-title font-semibold tabular-nums text-ink">
              {panel.costOfLivingCents ? months(panel.personalRunwayMonths) : "—"}
            </p>
            <p className="mt-1 text-caption text-ink-faint">
              {panel.costOfLivingCents
                ? "savings ÷ cost of living"
                : "set your cost of living below"}
            </p>
          </div>
        </div>
      ) : null}

      {/* Bank reconcile drift */}
      {panel && panel.bankBalanceCents != null ? (
        <div className="rounded-card border border-subtle bg-surface px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-ink-muted">Bank balance (reconciled)</span>
            <span className="tabular-nums text-ink">{dollars(panel.bankBalanceCents)}</span>
          </div>
          {panel.bankDriftCents != null && panel.bankDriftCents !== 0 ? (
            <p className="mt-1 text-caption text-critical">
              Off by {dollars(panel.bankDriftCents)} from computed cash — a missed expense or draw?
            </p>
          ) : (
            <p className="mt-1 text-caption text-ink-faint">Matches computed cash.</p>
          )}
        </div>
      ) : null}

      {byCategory ? <ExpensesByCategoryChart data={byCategory} /> : null}

      <SettingsEditor
        settings={settings}
        onSave={(patch) => updateSettings.mutate(patch)}
        saving={updateSettings.isPending}
      />

      <EntrySection
        title="Business expenses"
        rows={(expenses ?? []).map((e) => ({
          id: e.id,
          amountCents: e.amountCents,
          date: e.incurredOn,
          label: e.category || e.description || "Expense",
          source: e.source,
        }))}
        onAdd={(amountCents, date, label) =>
          addExpense.mutate({ amountCents, incurredOn: date, category: label || undefined })
        }
        onDelete={(id) => deleteExpense.mutate({ id })}
        addLabelPlaceholder="Category (e.g. Software)"
        adding={addExpense.isPending}
        extra={<XeroImport onImported={() => void invalidateAll()} />}
      />

      <EntrySection
        title="Owner draws"
        rows={(draws ?? []).map((d) => ({
          id: d.id,
          amountCents: d.amountCents,
          date: d.drawnOn,
          label: d.note || "Draw",
          source: null,
        }))}
        onAdd={(amountCents, date, label) =>
          addDraw.mutate({ amountCents, drawnOn: date, note: label || undefined })
        }
        onDelete={(id) => deleteDraw.mutate({ id })}
        addLabelPlaceholder="Note (optional)"
        adding={addDraw.isPending}
      />
    </section>
  );
}

function LedgerRow({
  label,
  value,
  sign,
  strong,
}: {
  label: string;
  value: string;
  sign?: "+" | "−";
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? "font-medium text-ink" : "text-ink-muted"}>{label}</span>
      <span className={`tabular-nums ${strong ? "font-semibold text-ink" : "text-ink"}`}>
        {sign ? `${sign} ` : ""}
        {value}
      </span>
    </div>
  );
}

type SettingsData =
  | {
      taxReservePercentBps: number | null;
      costOfLivingCents: number | null;
      personalSavingsCents: number | null;
      minimumDrawCents: number | null;
      bankBalanceCents: number | null;
    }
  | undefined;

function SettingsEditor({
  settings,
  onSave,
  saving,
}: {
  settings: SettingsData;
  onSave: (patch: {
    taxReservePercent?: number | null;
    costOfLivingCents?: number | null;
    personalSavingsCents?: number | null;
    minimumDrawCents?: number | null;
    bankBalanceCents?: number | null;
  }) => void;
  saving: boolean;
}) {
  return (
    <details className="rounded-card border border-subtle bg-surface">
      <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-ink">
        Money settings
      </summary>
      <form
        className="flex flex-col gap-3 px-4 pb-4"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const read = (name: string) => (form.elements.namedItem(name) as HTMLInputElement).value;
          const num = (v: string) => (v.trim() === "" ? null : Number(v));
          const centsOrNull = (v: string) => (v.trim() === "" ? null : Math.round(Number(v) * 100));
          onSave({
            taxReservePercent: num(read("taxPct")),
            costOfLivingCents: centsOrNull(read("col")),
            personalSavingsCents: centsOrNull(read("savings")),
            minimumDrawCents: centsOrNull(read("minDraw")),
            bankBalanceCents: centsOrNull(read("bank")),
          });
        }}
      >
        <SettingField
          name="taxPct"
          label="Tax reserve (%)"
          defaultValue={
            settings?.taxReservePercentBps != null ? settings.taxReservePercentBps / 100 : ""
          }
          step="0.5"
        />
        <SettingField
          name="col"
          label="Cost of living ($/mo)"
          defaultValue={settings?.costOfLivingCents != null ? settings.costOfLivingCents / 100 : ""}
        />
        <SettingField
          name="savings"
          label="Personal savings ($)"
          defaultValue={
            settings?.personalSavingsCents != null ? settings.personalSavingsCents / 100 : ""
          }
        />
        <SettingField
          name="minDraw"
          label="Minimum draw ($/mo)"
          defaultValue={settings?.minimumDrawCents != null ? settings.minimumDrawCents / 100 : ""}
        />
        <SettingField
          name="bank"
          label="Bank balance — reconcile ($)"
          defaultValue={settings?.bankBalanceCents != null ? settings.bankBalanceCents / 100 : ""}
        />
        <button
          type="submit"
          disabled={saving}
          className="self-start rounded-pill bg-active-raised px-4 py-1.5 text-xs font-medium text-active-raised-border transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </form>
    </details>
  );
}

function SettingField({
  name,
  label,
  defaultValue,
  step,
}: {
  name: string;
  label: string;
  defaultValue: string | number;
  step?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-ink-muted">{label}</span>
      <input
        name={name}
        type="number"
        min={0}
        step={step ?? "1"}
        defaultValue={defaultValue}
        className="w-32 rounded-control border border-subtle bg-surface px-2 py-1 text-right text-sm tabular-nums text-ink"
      />
    </label>
  );
}

type EntryRow = {
  id: string;
  amountCents: number;
  date: Date;
  label: string;
  source: string | null;
};

function EntrySection({
  title,
  rows,
  onAdd,
  onDelete,
  addLabelPlaceholder,
  adding,
  extra,
}: {
  title: string;
  rows: EntryRow[];
  onAdd: (amountCents: number, date: Date, label: string) => void;
  onDelete: (id: string) => void;
  addLabelPlaceholder: string;
  adding: boolean;
  extra?: ReactNode;
}) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIso());
  const [label, setLabel] = useState("");

  const submit = () => {
    const cents = centsFromInput(amount);
    if (cents == null || cents === 0) return;
    onAdd(cents, new Date(`${date}T00:00:00`), label.trim());
    setAmount("");
    setLabel("");
  };

  return (
    <details className="rounded-card border border-subtle bg-surface">
      <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-ink">
        {title}
        <span className="ml-2 text-caption text-ink-faint">{rows.length}</span>
      </summary>
      <div className="flex flex-col gap-2 px-4 pb-4">
        {extra}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="$ amount"
            className="w-28 rounded-control border border-subtle bg-surface px-2 py-1 text-sm tabular-nums text-ink"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-control border border-subtle bg-surface px-2 py-1 text-sm text-ink"
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={addLabelPlaceholder}
            className="min-w-40 flex-1 rounded-control border border-subtle bg-surface px-2 py-1 text-sm text-ink"
          />
          <button
            type="button"
            onClick={submit}
            disabled={adding}
            className="inline-flex items-center gap-1 rounded-pill border border-subtle px-3 py-1 text-xs font-medium text-ink transition hover:text-accent disabled:opacity-50"
          >
            <Plus size={14} /> Add
          </button>
        </div>

        {rows.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {rows.slice(0, 30).map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-control bg-surface-2 px-3 py-1.5 text-sm"
              >
                <span className="flex items-center gap-2 truncate text-ink">
                  <span className="tabular-nums text-ink-muted">
                    {row.date.toISOString().slice(0, 10)}
                  </span>
                  <span className="truncate">{row.label}</span>
                  {row.source === "csv_import" ? (
                    <span className="rounded-pill bg-surface px-1.5 text-caption text-ink-faint">
                      imported
                    </span>
                  ) : null}
                </span>
                <span className="flex items-center gap-2">
                  <span className="tabular-nums text-ink">{dollarsExact(row.amountCents)}</span>
                  <button
                    type="button"
                    onClick={() => onDelete(row.id)}
                    title="Delete"
                    className="text-ink-faint transition hover:text-critical"
                  >
                    <Trash2 size={14} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </details>
  );
}

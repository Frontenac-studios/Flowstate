"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { QueryErrorNotice } from "@/components/kash/ui/QueryErrorNotice";
import type { KashClientRow, KashProjectRow } from "@/lib/money/kash-table";
import { projectSolidVar } from "@/lib/projects/project-hue";
import { useTRPC } from "@/trpc/client";

const SECONDS_PER_HOUR = 3600;
const GRID =
  "grid grid-cols-[minmax(12rem,1fr)_150px_130px_130px_150px] items-center gap-4 [&>*:not(:first-child)]:text-right";

/** Whole dollars — the table is a read, not a ledger ("$2,900", not "$2,900.00"). */
function dollars(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(cents / 100));
}

function hours(seconds: number): string {
  return `${(seconds / SECONDS_PER_HOUR).toFixed(1)} h`;
}

/** An empty cell is a faint dash, never "$0" (KashB2). */
function Cell({
  cents,
  strong,
  unpaid,
}: {
  cents: number | null;
  strong?: boolean;
  unpaid?: boolean;
}) {
  if (cents == null || cents === 0) return <span className="text-ink-faint">—</span>;
  return (
    <span
      className={`tabular-nums ${strong ? "font-semibold" : ""} ${unpaid ? "text-unpaid" : "text-ink"}`}
    >
      {dollars(cents)}
    </span>
  );
}

function Dot({ hue }: { hue: number | null }) {
  return (
    <span
      aria-hidden
      className="size-2 shrink-0 rounded-full"
      style={{
        background:
          hue != null ? projectSolidVar({ category: "business", hue }) : "var(--ink-faint)",
      }}
    />
  );
}

function ProjectRowView({ p }: { p: KashProjectRow }) {
  const billable =
    p.billingType === "hourly" && p.billableSeconds > 0 ? (
      <span className="tabular-nums text-ink">
        {hours(p.billableSeconds)} · {dollars(p.billableCents)}
      </span>
    ) : (
      <Cell cents={p.billableCents} />
    );
  return (
    <div role="row" className={`${GRID} min-h-11 text-[14px]`}>
      <span role="cell" className="min-w-0 truncate pl-6">
        <Link
          href={`/projects/${p.id}`}
          className="kash-focus-visible text-ink outline-none hover:underline"
        >
          {p.name}
        </Link>
        <span className="text-caption text-ink-muted"> · {p.note}</span>
      </span>
      <span role="cell">{billable}</span>
      <span role="cell">
        <Cell cents={p.arCents} />
      </span>
      <span role="cell">
        <Cell cents={p.paidCents} />
      </span>
      <span role="cell">
        {p.contractCents != null ? (
          <Cell cents={p.contractCents} />
        ) : p.billingType === "hourly" ? (
          <span className="text-ink">Hourly</span>
        ) : (
          <span className="text-ink-faint">—</span>
        )}
      </span>
    </div>
  );
}

function ClientRowView({ c }: { c: KashClientRow }) {
  return (
    <div role="rowgroup" className="border-t border-border">
      <div role="row" className={`${GRID} min-h-14`}>
        <span role="cell" className="flex min-w-0 items-center gap-2 text-body font-semibold">
          <Dot hue={c.hue} />
          <Link
            href={`/clients/${c.id}`}
            className="kash-focus-visible truncate text-ink outline-none hover:underline"
          >
            {c.name}
          </Link>
          {c.rateCents != null ? (
            <span className="shrink-0 text-caption font-medium text-ink-muted">
              {dollars(c.rateCents)}/hr
            </span>
          ) : null}
        </span>
        <span role="cell">
          <Cell cents={c.billableCents} strong />
        </span>
        <span role="cell">
          <Cell cents={c.arCents} strong unpaid />
        </span>
        <span role="cell">
          <Cell cents={c.paidCents} strong />
        </span>
        <span role="cell">
          <Cell cents={c.contractCents} strong />
        </span>
      </div>
      {c.projects.map((p) => (
        <ProjectRowView key={p.id} p={p} />
      ))}
    </div>
  );
}

function Total({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-caption text-ink-muted">{label}</span>
      <span className="text-[28px] font-bold tabular-nums leading-tight tracking-[-0.02em] text-ink">
        {value}
      </span>
      <span className="text-caption text-ink-muted">{sub}</span>
    </div>
  );
}

/**
 * Spec v5 KashB2: three totals, then one table — client rows carry the sums,
 * projects nested below. Billable shows hours + amount (hourly) or the amount
 * (lump sum); unpaid AR is amber; empty cells are a faint dash.
 */
export default function KashTable() {
  const trpc = useTRPC();
  const query = useQuery(trpc.money.kashTable.queryOptions());

  if (query.isError)
    return (
      <QueryErrorNotice
        message="The money table didn't load."
        onRetry={() => void query.refetch()}
      />
    );
  const table = query.data;
  const t = table?.totals;

  const billableSub = t
    ? [
        t.billableSeconds > 0 ? hours(t.billableSeconds) : null,
        t.billableInstallments > 0
          ? `${t.billableInstallments} lump ${t.billableInstallments === 1 ? "sum" : "sums"}`
          : null,
      ]
        .filter(Boolean)
        .join(" + ") || "Nothing unbilled"
    : " ";

  return (
    <>
      <div className="flex flex-wrap gap-x-12 gap-y-4 px-1">
        <Total label="Billable now" value={t ? dollars(t.billableCents) : "—"} sub={billableSub} />
        <Total
          label="AR outstanding"
          value={t ? dollars(t.arCents) : "—"}
          sub={
            t
              ? t.unpaidInvoices === 0
                ? "All invoices paid"
                : `${t.unpaidInvoices} ${t.unpaidInvoices === 1 ? "invoice" : "invoices"} unpaid`
              : " "
          }
        />
        <Total
          label="Paid to date"
          value={t ? dollars(t.paidThisYearCents) : "—"}
          sub="This year"
        />
      </div>

      <div className="overflow-x-auto rounded-card bg-surface px-5 pb-2 pt-1">
        <div role="table" aria-label="Money by client and project" className="min-w-[44rem]">
          <div role="row" className={`${GRID} min-h-11 text-caption font-semibold text-ink-muted`}>
            <span role="columnheader">Client / project</span>
            <span role="columnheader">Billable now</span>
            <span role="columnheader">AR</span>
            <span role="columnheader">Paid to date</span>
            <span role="columnheader">Contract</span>
          </div>
          {table && table.clients.length > 0 ? (
            table.clients.map((c) => <ClientRowView key={c.id} c={c} />)
          ) : (
            <p className="border-t border-border py-6 text-body text-ink-muted">
              {table ? (
                <>
                  No client work yet —{" "}
                  <Link href="/clients" className="text-ink underline">
                    add a client
                  </Link>{" "}
                  and link a project to it.
                </>
              ) : (
                "Loading…"
              )}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import DrawPanel from "@/components/kash/money/DrawPanel";
import InvoicesPanel from "@/components/kash/money/InvoicesPanel";
import KashTable from "@/components/kash/money/KashTable";
import MoneyReport from "@/components/kash/money/MoneyReport";
import TiltLedger from "@/components/kash/money/TiltLedger";
import { Users } from "@/components/kash/ui/icon";

function monthLine(now: Date): string {
  return now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** A label-caps heading over one of the tools below the table. */
function Section({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="px-1 text-micro font-semibold uppercase tracking-caps text-ink-muted">
        {label}
      </h2>
      {children}
    </section>
  );
}

/**
 * The Money surface (MISSION.md law 4c), laid out as Spec v5 KashB2: a month line,
 * the three totals and the client money table on top. The working tools sit below
 * it (Kat, 2026-09-30: table on top, nothing cut) — invoicing (the only place to
 * draft, accept, void and mark paid), the time report + CSV, the Ledger (the only
 * thing that seals fortnights) and the draw (cash, expenses, Xero import).
 */
export default function MoneyOverview() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-2">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-2">
          <span className="text-micro font-semibold uppercase tracking-caps text-ink-muted">
            {monthLine(new Date())}
          </span>
          <h1 className="text-xl font-bold text-ink">Money</h1>
        </div>
        <Link
          href="/clients"
          className="kash-focus-visible inline-flex items-center gap-2 rounded-pill border border-outline-border bg-surface px-4 py-2 text-sm font-semibold text-ink outline-none transition-colors hover:bg-tint-hover"
        >
          <Users size={16} className="text-ink-muted" />
          Clients
        </Link>
      </header>

      <KashTable />

      <div className="mt-4 flex flex-col gap-8">
        <Section id="money-invoicing" label="Invoicing">
          <InvoicesPanel />
        </Section>
        <Section id="money-time" label="Time">
          <MoneyReport />
        </Section>
        <TiltLedger />
        <Section id="money-draw" label="Cash & draw">
          <DrawPanel />
        </Section>
      </div>
    </div>
  );
}

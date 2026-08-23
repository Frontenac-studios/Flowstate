"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { ArrowRight, Users } from "@/components/kash/ui/icon";
import { useTRPC } from "@/trpc/client";

/**
 * The Money surface (MISSION.md law 4c). In W1 it holds Clients; revenue, the
 * effective rate, and invoices arrive with W3/W4. This stub keeps the
 * information architecture honest — Clients lives inside Money, not in its own
 * top-level home — without pretending the rest is built.
 */
export default function MoneyOverview() {
  const trpc = useTRPC();
  const { data: clients } = useQuery(trpc.clients.list.queryOptions({}));
  const clientCount = clients?.length ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-2">
      <header>
        <h1 className="text-title font-semibold text-ink">Money</h1>
        <p className="mt-1 text-sm text-ink-muted">
          The monthly view: who you work for, what they pay, and — soon — what you&apos;ve billed.
        </p>
      </header>

      <Link
        href="/clients"
        className="flex items-center justify-between gap-4 rounded-card border border-border bg-surface p-5 shadow-surface transition hover:bg-surface-2"
      >
        <span className="flex items-center gap-3">
          <Users size={20} className="text-ink-muted" />
          <span>
            <span className="block text-body font-medium text-ink">Clients</span>
            <span className="block text-caption text-ink-muted">
              {clientCount === 0
                ? "None yet — add your first client"
                : `${clientCount} ${clientCount === 1 ? "client" : "clients"}`}
            </span>
          </span>
        </span>
        <ArrowRight size={18} className="text-ink-muted" />
      </Link>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Revenue", detail: "Billable revenue this month" },
          { label: "Effective rate", detail: "Revenue ÷ all hours worked" },
          { label: "Invoices", detail: "Drafted, sent, unpaid" },
        ].map((tile) => (
          <div
            key={tile.label}
            className="rounded-card border border-dashed border-border bg-surface p-4"
          >
            <p className="text-body font-medium text-ink">{tile.label}</p>
            <p className="mt-1 text-caption text-ink-muted">{tile.detail}</p>
            <p className="mt-3 text-caption text-ink-faint">Coming soon</p>
          </div>
        ))}
      </section>
    </div>
  );
}

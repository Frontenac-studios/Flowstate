"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import InvoicesPanel from "@/components/kash/money/InvoicesPanel";
import MoneyReport from "@/components/kash/money/MoneyReport";
import { ArrowRight, Users } from "@/components/kash/ui/icon";
import { useTRPC } from "@/trpc/client";

/**
 * The Money surface (MISSION.md law 4c). Clients live inside Money, and W3 adds
 * the time report — totals, effective rate, and the client → project → task
 * breakdown. W4 adds invoicing: ready-to-bill clients, drafts you sign, and history.
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
          The monthly view: who you work for, what they pay, and what you&apos;ve billed.
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

      <MoneyReport />

      <InvoicesPanel />
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";

/**
 * W14 — "Waiting on you" block (goals 1+2). Folds pipeline + outreach. In v1 the one
 * row-type with real data is **live deals** = prospect-state projects; the sourced
 * batch and follow-ups owed light up with W10 (the sourcing agent), so the block
 * holds its slot with an honest note rather than an empty card.
 */
export function WaitingOnYouBlock() {
  const trpc = useTRPC();
  const { data: deals = [] } = useQuery(trpc.steering.waitingOnYou.queryOptions());

  return (
    <section className="flex flex-col gap-2 rounded-card border border-subtle bg-surface p-4 shadow-surface">
      <h3 className="text-caption font-semibold uppercase tracking-wide text-ink-muted">
        Waiting on you
      </h3>
      {deals.length === 0 ? (
        <p className="text-meta text-ink-faint">
          No deals in flight. Sourcing and follow-ups arrive with the pipeline agent.
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-1.5">
            {deals.map((deal) => (
              <li key={deal.id} className="flex items-center gap-2">
                <span className="shrink-0 rounded-pill border border-subtle px-1.5 py-0.5 text-meta text-ink-faint">
                  Deal
                </span>
                <span className="min-w-0 truncate text-sm text-ink">{deal.name}</span>
                {deal.clientName ? (
                  <span className="ml-auto shrink-0 text-meta text-ink-faint">
                    {deal.clientName}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="text-meta text-ink-faint">Sourced batch + follow-ups arrive with W10.</p>
        </>
      )}
    </section>
  );
}

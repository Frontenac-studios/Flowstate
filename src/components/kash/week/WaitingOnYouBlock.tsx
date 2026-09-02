"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import type { WaitingRowKind } from "@/lib/week/waiting-on-you";
import { useTRPC } from "@/trpc/client";

/**
 * "Waiting on you" (W14 block, filled in by W10g). One urgency-sorted queue folding
 * the pipeline and the outreach: the sourced batch to triage, follow-ups the aging
 * clock says you owe, and live deals needing a move.
 *
 * The three row types are visually distinct by their chip, and the queue carries no
 * funnel stage counts — Week asks "what needs me", the Projects board answers "how
 * is the pipeline shaped".
 */
const ROW_CHIP: Record<WaitingRowKind, string> = {
  sourced: "Sourced",
  follow_up: "Follow up",
  deal: "Deal",
};

/** Follow-ups read as the loudest row; the sourced batch is deliberately the quietest. */
const ROW_TONE: Record<WaitingRowKind, string> = {
  sourced: "border-subtle text-ink-faint",
  follow_up: "border-ink text-ink",
  deal: "border-subtle text-ink-muted",
};

export function WaitingOnYouBlock() {
  const trpc = useTRPC();
  const { data: rows = [] } = useQuery(trpc.steering.waitingOnYou.queryOptions());

  return (
    <section className="flex flex-col gap-2 rounded-card border border-subtle bg-surface p-4 shadow-surface">
      <h3 className="text-caption font-semibold uppercase tracking-wide text-ink-muted">
        Waiting on you
      </h3>
      {rows.length === 0 ? (
        <p className="text-meta text-ink-faint">
          Nothing waiting — no prospects to triage, no follow-ups owed, no deals in flight.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.map((row) => (
            <li key={`${row.kind}:${row.id}`}>
              <Link
                href={row.href}
                className="flex items-center gap-2 rounded-control px-1 py-0.5 transition hover:bg-surface-2"
              >
                <span
                  className={`shrink-0 rounded-pill border px-1.5 py-0.5 text-meta ${ROW_TONE[row.kind]}`}
                >
                  {ROW_CHIP[row.kind]}
                </span>
                <span className="min-w-0 truncate text-sm text-ink">{row.label}</span>
                {row.detail ? (
                  <span className="ml-auto shrink-0 truncate text-meta text-ink-faint">
                    {row.detail}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

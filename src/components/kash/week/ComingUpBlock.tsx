"use client";

import { useQuery } from "@tanstack/react-query";

import { categorySolidVar } from "@/lib/projects/category-tokens";
import type { ComingUpItem } from "@/lib/week/bucket-coming-up";
import { useTRPC } from "@/trpc/client";

const SHORT_DATE: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

function formatShortDate(iso: string): string {
  // Parse as a plain calendar date (avoid TZ shifting the day).
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1).toLocaleDateString(undefined, SHORT_DATE);
}

function Bucket({ label, items }: { label: string; items: ComingUpItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-meta uppercase tracking-wide text-ink-faint">{label}</p>
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={`${item.kind}:${item.id}`} className="flex items-center gap-2">
            <span
              className="h-3.5 w-1 shrink-0 rounded-full"
              style={{ backgroundColor: categorySolidVar(item.category) }}
            />
            <span className="min-w-0 truncate text-sm text-ink">{item.title}</span>
            <span className="ml-auto flex shrink-0 items-baseline gap-2 text-meta text-ink-faint">
              <span className="max-w-[8rem] truncate">{item.clientName ?? item.projectName}</span>
              <span>{formatShortDate(item.date)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * W14 — "Coming up" block (goal 4). Dated deliverables across every client for the
 * next 14 days, in two calm buckets: this week / next week. Overdue is excluded (it
 * lives on Today). Category read by the stripe colour; client read by name label.
 */
export function ComingUpBlock({ localDate }: { localDate: string }) {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.steering.comingUp.queryOptions({ localDate }));
  const thisWeek = data?.thisWeek ?? [];
  const nextWeek = data?.nextWeek ?? [];
  const empty = thisWeek.length === 0 && nextWeek.length === 0;

  return (
    <section className="flex flex-col gap-2 rounded-card border border-subtle bg-surface p-4 shadow-surface">
      <h3 className="text-caption font-semibold uppercase tracking-wide text-ink-muted">
        Coming up
      </h3>
      {empty ? (
        <p className="text-meta text-ink-faint">Nothing due in the next two weeks.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          <Bucket label="This week" items={thisWeek} />
          <Bucket label="Next week" items={nextWeek} />
        </div>
      )}
    </section>
  );
}

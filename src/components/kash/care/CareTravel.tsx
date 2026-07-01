"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";

import Button from "@/components/kash/ui/Button";
import { defaultReservedDayLabel } from "@/lib/planning/reserved-day-category";
import { useTRPC } from "@/trpc/client";

export function CareTravel() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const now = useMemo(() => new Date(), []);
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const reservedQuery = useQuery(trpc.planning.listReservedDays.queryOptions({ year, month }));
  const createMutation = useMutation(
    trpc.planning.createReservedDay.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.planning.listReservedDays.queryKey({ year, month }),
        });
      },
    })
  );

  const reservedDays = reservedQuery.data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-card border border-subtle bg-surface p-4">
        <h2 className="mb-1 text-subtitle font-medium text-ink">Restorative time</h2>
        <p className="mb-4 text-body leading-snug text-ink-muted">
          Block personal or outside days around work — a rest day, a long weekend, or time away.
        </p>
        <Link href="/plan?horizon=month" className="text-meta text-accent hover:underline">
          Open month planning →
        </Link>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-caption font-medium text-ink-muted">This month</h2>
          {reservedDays.length < 2 ? (
            <Button
              type="button"
              variant="ghost"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate({ year, month, type: "personal" })}
            >
              {createMutation.isPending ? "Adding…" : "+ Rest day"}
            </Button>
          ) : null}
        </div>
        {reservedQuery.isLoading ? (
          <p className="text-meta text-ink-faint">Loading…</p>
        ) : reservedDays.length === 0 ? (
          <div className="rounded-card border border-dashed border-subtle bg-surface-2 px-4 py-8 text-center">
            <p className="text-body text-ink-muted">No restorative days planned yet.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {reservedDays.map((day) => (
              <li
                key={day.id}
                className="flex items-center justify-between rounded-card border border-subtle bg-surface px-3 py-2.5"
              >
                <div>
                  <p className="text-body text-ink">
                    {day.label ?? defaultReservedDayLabel(day.type)}
                  </p>
                  <p className="text-caption text-ink-faint">
                    {day.resolvedDate ? `Planned for ${day.resolvedDate}` : "Date not set yet"}
                  </p>
                </div>
                <span className="rounded-chip bg-surface-2 px-2 py-0.5 text-caption text-ink-muted">
                  {day.type === "personal" ? "Rest" : "Outside"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

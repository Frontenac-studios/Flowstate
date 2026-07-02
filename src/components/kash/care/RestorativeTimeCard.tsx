"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";

import Button from "@/components/kash/ui/Button";
import { defaultReservedDayLabel } from "@/lib/planning/reserved-day-category";
import { useTRPC } from "@/trpc/client";

/** Restorative-time card on the Garden hub (D33 — Travel tab retired). */
export function RestorativeTimeCard() {
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
    <section className="rounded-card border border-subtle bg-surface p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-caption font-medium text-ink-muted">Restorative time</h2>
        <Link href="/plan?horizon=month" className="text-meta text-accent hover:underline">
          Month planning →
        </Link>
      </div>
      <p className="mb-3 text-meta leading-snug text-ink-faint">
        Block personal or outside days — a rest day, a long weekend, or time away.
      </p>
      {reservedQuery.isLoading ? (
        <p className="text-meta text-ink-faint">Loading…</p>
      ) : reservedDays.length === 0 ? (
        <div className="rounded-control border border-dashed border-subtle bg-surface-2 px-4 py-6 text-center">
          <p className="mb-3 text-body text-ink-muted">
            No restorative days planned yet — even one quiet day can help you reset.
          </p>
          <Button
            type="button"
            variant="ghost"
            className="text-caption"
            disabled={createMutation.isPending}
            onClick={() => createMutation.mutate({ year, month, type: "personal" })}
          >
            {createMutation.isPending ? "Adding…" : "Reserve a rest day"}
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {reservedDays.map((day) => (
            <li
              key={day.id}
              className="flex items-center justify-between rounded-control border border-subtle px-3 py-2"
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
          {reservedDays.length < 2 ? (
            <Button
              type="button"
              variant="ghost"
              className="self-start text-caption"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate({ year, month, type: "personal" })}
            >
              {createMutation.isPending ? "Adding…" : "+ Rest day"}
            </Button>
          ) : null}
        </ul>
      )}
    </section>
  );
}

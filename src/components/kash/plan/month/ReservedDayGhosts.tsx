"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import GhostedAccept from "@/components/kash/plan/GhostedAccept";
import { formatHeaderDate, parseISODateString } from "@/lib/dates/local-day";
import { useTRPC } from "@/trpc/client";

type Props = {
  year: number;
  month: number;
  hasUnresolvedReservedDays: boolean;
};

export default function ReservedDayGhosts({ year, month, hasUnresolvedReservedDays }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [stagedIds, setStagedIds] = useState<Set<string>>(new Set());

  const suggestionsQuery = useQuery(
    trpc.planning.listSuggestions.queryOptions({
      surface: "reserved_day",
      status: "pending",
    })
  );

  const suggestMutation = useMutation(
    trpc.planning.suggestReservedDayDates.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.planning.listSuggestions.queryKey() });
      },
    })
  );

  const stageSuggestionMutation = useMutation(
    trpc.planning.updateSuggestionStatus.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.planning.listSuggestions.queryKey() });
      },
    })
  );

  const applySuggestionsMutation = useMutation(
    trpc.planning.applyStagedSuggestions.mutationOptions({
      onSuccess: () => {
        setStagedIds(new Set());
        void queryClient.invalidateQueries({ queryKey: trpc.planning.listSuggestions.queryKey() });
        void queryClient.invalidateQueries({
          queryKey: trpc.planning.listReservedDays.queryKey({ year, month }),
        });
        void queryClient.invalidateQueries({
          queryKey: trpc.protectedBlocks.listForMonth.queryKey({ year, month }),
        });
      },
    })
  );

  const reservedSuggestions = useMemo(() => {
    return (suggestionsQuery.data ?? []).filter((s) => {
      const payload = s.payload as { year?: number; month?: number };
      return payload.year === year && payload.month === month;
    });
  }, [suggestionsQuery.data, year, month]);

  const ghostItems = reservedSuggestions.map((s) => {
    const payload = s.payload as { label?: string; suggestedDate?: string };
    const dateLabel = payload.suggestedDate
      ? formatHeaderDate(parseISODateString(payload.suggestedDate))
      : "a date";
    return {
      id: s.id,
      label: `${payload.label ?? "Reserved day"} → ${dateLabel}`,
      detail: "Suggested protected block",
    };
  });

  if (ghostItems.length === 0 && !hasUnresolvedReservedDays) return null;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-caption font-medium uppercase tracking-wide text-ink-muted">
          Suggested dates
        </h3>
        {hasUnresolvedReservedDays ? (
          <button
            type="button"
            disabled={suggestMutation.isPending}
            onClick={() => suggestMutation.mutate({ year, month })}
            className="text-caption text-ink-muted transition hover:text-ink disabled:opacity-40"
          >
            {suggestMutation.isPending ? "Suggesting…" : "Suggest dates"}
          </button>
        ) : null}
      </div>

      {ghostItems.length > 0 ? (
        <GhostedAccept
          items={ghostItems}
          stagedIds={stagedIds}
          applyLabel="Apply dates"
          onStage={(id) => {
            setStagedIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          onDismiss={(id) => {
            stageSuggestionMutation.mutate({ id, status: "dismissed" });
            setStagedIds((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          }}
          onApply={() => {
            void (async () => {
              for (const id of Array.from(stagedIds)) {
                await stageSuggestionMutation.mutateAsync({ id, status: "staged" });
              }
              applySuggestionsMutation.mutate();
            })();
          }}
        />
      ) : null}
    </section>
  );
}

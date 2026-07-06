"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import GhostedAccept from "@/components/kash/plan/GhostedAccept";
import { monthShortName } from "@/lib/planning/quarter-months";
import { useTRPC } from "@/trpc/client";

type Props = {
  year: number;
  quarter: number;
  hasUnassignedGoals: boolean;
};

export default function QuarterSpreadGhosts({ year, quarter, hasUnassignedGoals }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [stagedIds, setStagedIds] = useState<Set<string>>(new Set());

  const suggestionsQuery = useQuery(
    trpc.planning.listSuggestions.queryOptions({
      surface: "quarter_spread",
      status: "pending",
    })
  );

  const suggestMutation = useMutation(
    trpc.planning.suggestQuarterSpread.mutationOptions({
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
        void queryClient.invalidateQueries({ queryKey: trpc.planning.listGoals.queryKey() });
      },
    })
  );

  const spreadSuggestions = useMemo(() => {
    return (suggestionsQuery.data ?? []).filter((s) => {
      const payload = s.payload as { year?: number; quarter?: number };
      return payload.year === year && payload.quarter === quarter;
    });
  }, [suggestionsQuery.data, year, quarter]);

  const ghostItems = spreadSuggestions.map((s) => {
    const payload = s.payload as { goalTitle?: string; targetMonth?: number };
    const monthLabel =
      payload.targetMonth != null ? monthShortName(payload.targetMonth) : "a month";
    return {
      id: s.id,
      label: `${payload.goalTitle ?? "Goal"} → ${monthLabel}`,
      detail: "Suggested month assignment",
    };
  });

  if (ghostItems.length === 0 && !hasUnassignedGoals) return null;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-caption font-medium uppercase tracking-wide text-ink-muted">
          Month spread
        </h3>
        {hasUnassignedGoals ? (
          <button
            type="button"
            disabled={suggestMutation.isPending}
            onClick={() => suggestMutation.mutate({ year, quarter: quarter as 1 | 2 | 3 | 4 })}
            className="text-caption text-ink-muted transition hover:text-ink disabled:opacity-40"
          >
            {suggestMutation.isPending ? "Suggesting…" : "Suggest spread"}
          </button>
        ) : null}
      </div>

      {suggestMutation.isSuccess && ghostItems.length === 0 ? (
        <p className="text-caption text-ink-muted">No spread to suggest right now.</p>
      ) : null}

      {ghostItems.length > 0 ? (
        <GhostedAccept
          items={ghostItems}
          stagedIds={stagedIds}
          applyLabel="Apply spread"
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

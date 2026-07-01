"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import GhostedAccept from "@/components/kash/plan/GhostedAccept";
import { categoryLabel, type ProjectCategory } from "@/lib/projects/categories";
import { useTRPC } from "@/trpc/client";

type Props = {
  scopeKey: string;
};

export default function BalancePassGhosts({ scopeKey }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [stagedIds, setStagedIds] = useState<Set<string>>(new Set());

  const suggestionsQuery = useQuery(
    trpc.planning.listSuggestions.queryOptions({
      surface: "balance_pass",
      status: "pending",
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
        void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
      },
    })
  );

  const balanceSuggestions = useMemo(() => {
    return (suggestionsQuery.data ?? []).filter((s) => {
      const payload = s.payload as { scopeKey?: string };
      return payload.scopeKey === scopeKey;
    });
  }, [suggestionsQuery.data, scopeKey]);

  const ghostItems = balanceSuggestions.map((s) => {
    const payload = s.payload as {
      label?: string;
      taskTitle?: string;
      category?: ProjectCategory;
      tier?: "floor" | "target_gap";
      source?: "abyss" | "generated";
    };
    const tierLabel = payload.tier === "floor" ? "Floor" : "Target gap";
    const sourceLabel = payload.source === "abyss" ? "From backlog" : "Suggested";
    return {
      id: s.id,
      label: payload.taskTitle ?? payload.label ?? "Balance suggestion",
      detail: `${tierLabel} · ${sourceLabel}${
        payload.category ? ` · ${categoryLabel(payload.category)}` : ""
      }`,
    };
  });

  if (ghostItems.length === 0) return null;

  return (
    <GhostedAccept
      items={ghostItems}
      stagedIds={stagedIds}
      applyLabel="Apply balance"
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
  );
}

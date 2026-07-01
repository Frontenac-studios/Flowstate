"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import GhostedAccept from "@/components/kash/plan/GhostedAccept";
import { checkInDepthLabel } from "@/lib/planning/check-in";
import { useTRPC } from "@/trpc/client";

type Props = {
  scopeKey: string;
};

export default function CheckInGhosts({ scopeKey }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [stagedIds, setStagedIds] = useState<Set<string>>(new Set());

  const suggestionsQuery = useQuery(
    trpc.planning.listSuggestions.queryOptions({
      surface: "check_in",
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
        void queryClient.invalidateQueries({ queryKey: trpc.planning.listGoals.queryKey() });
        void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
      },
    })
  );

  const checkInSuggestions = useMemo(() => {
    return (suggestionsQuery.data ?? []).filter((s) => {
      const payload = s.payload as { scopeKey?: string };
      return payload.scopeKey === scopeKey;
    });
  }, [suggestionsQuery.data, scopeKey]);

  const ghostItems = checkInSuggestions.map((s) => {
    const payload = s.payload as {
      label?: string;
      action?: string;
      depth?: string;
      goalTitle?: string;
      taskTitle?: string;
    };
    const actionLabel =
      payload.action === "goal_horizon"
        ? "Horizon"
        : payload.action === "milestone"
          ? "Milestone"
          : payload.action === "task_schedule"
            ? "Schedule"
            : "Suggestion";
    const depth = payload.depth ? checkInDepthLabel(payload.depth as "week") : null;
    return {
      id: s.id,
      label: payload.label ?? payload.goalTitle ?? payload.taskTitle ?? "Check-in suggestion",
      detail: [actionLabel, depth].filter(Boolean).join(" · "),
    };
  });

  if (ghostItems.length === 0) return null;

  return (
    <GhostedAccept
      items={ghostItems}
      stagedIds={stagedIds}
      applyLabel="Apply check-in"
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

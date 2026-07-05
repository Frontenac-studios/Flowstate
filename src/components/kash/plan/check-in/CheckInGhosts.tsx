"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import GhostedAccept from "@/components/kash/plan/GhostedAccept";
import { useToast } from "@/components/kash/ui/ToastProvider";
import { checkInDepthLabel } from "@/lib/planning/check-in";
import { useTRPC } from "@/trpc/client";

type Props = {
  scopeKey: string;
};

export default function CheckInGhosts({ scopeKey }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { toast } = useToast();
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
      onError: () =>
        toast({ message: "Couldn't apply the check-in. Please try again.", variant: "error" }),
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
          const ids = Array.from(stagedIds);
          // Stage each independently so one failure doesn't silently abort the rest.
          const results = await Promise.allSettled(
            ids.map((id) => stageSuggestionMutation.mutateAsync({ id, status: "staged" }))
          );
          const failed = results.filter((r) => r.status === "rejected").length;
          if (failed > 0) {
            toast({
              message: `Couldn't stage ${failed} of ${ids.length}. Please try again.`,
              variant: "error",
            });
          }
          if (failed < ids.length) applySuggestionsMutation.mutate();
        })();
      }}
    />
  );
}

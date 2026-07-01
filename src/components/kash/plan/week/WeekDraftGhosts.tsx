"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import GhostedAccept from "@/components/kash/plan/GhostedAccept";
import { formatHeaderDate, parseISODateString } from "@/lib/dates/local-day";
import { useTRPC } from "@/trpc/client";

type Props = {
  anchorDate: string;
  hasInboxTasks: boolean;
};

export default function WeekDraftGhosts({ anchorDate, hasInboxTasks }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [stagedIds, setStagedIds] = useState<Set<string>>(new Set());

  const suggestionsQuery = useQuery(
    trpc.planning.listSuggestions.queryOptions({
      surface: "week_draft",
      status: "pending",
    })
  );

  const suggestMutation = useMutation(
    trpc.planning.suggestWeekDraft.mutationOptions({
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
        void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
      },
    })
  );

  const weekSuggestions = useMemo(() => {
    return (suggestionsQuery.data ?? []).filter((s) => {
      const payload = s.payload as { weekStart?: string };
      return payload.weekStart === anchorDate;
    });
  }, [suggestionsQuery.data, anchorDate]);

  const ghostItems = weekSuggestions.map((s) => {
    const payload = s.payload as {
      taskTitle?: string;
      scheduledDate?: string;
      rationale?: string;
    };
    const dateLabel = payload.scheduledDate
      ? formatHeaderDate(parseISODateString(payload.scheduledDate))
      : "a day";
    return {
      id: s.id,
      label: `${payload.taskTitle ?? "Task"} → ${dateLabel}`,
      detail: payload.rationale ?? "Suggested week placement",
    };
  });

  if (ghostItems.length === 0 && !hasInboxTasks) return null;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-caption font-medium uppercase tracking-wide text-ink-muted">
          Week draft
        </h3>
        {hasInboxTasks ? (
          <button
            type="button"
            disabled={suggestMutation.isPending}
            onClick={() => suggestMutation.mutate({ anchorDate })}
            className="text-caption text-ink-muted transition hover:text-ink disabled:opacity-40"
          >
            {suggestMutation.isPending ? "Drafting…" : "Draft week"}
          </button>
        ) : null}
      </div>

      {ghostItems.length > 0 ? (
        <GhostedAccept
          items={ghostItems}
          stagedIds={stagedIds}
          applyLabel="Apply draft"
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

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { useOptionalToast } from "@/components/kash/ui/ToastProvider";
import { occurrenceRef, type MaybeOccurrenceTask } from "@/lib/tasks/occurrence-ref";
import { useTRPC } from "@/trpc/client";

/**
 * The minimum a task must expose for the completion toast to know how to undo it.
 * A recurring occurrence carries a synthetic (non-uuid) `id`, so it must be
 * un-completed through `recurrence.uncompleteOccurrence`, not `tasks.uncomplete`.
 */
export type CompletableTask = MaybeOccurrenceTask & { id: string };

/**
 * Shared "Completed · Undo" toast fired on task completion, so undo is a visible,
 * discoverable affordance on every surface (D3) — not just the keyboard-only
 * session-undo stack. Occurrence-aware, and a no-op when no ToastProvider is
 * mounted, so it's safe to call from any surface including `/today/focus`.
 */
export function useCompletionToast() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const toast = useOptionalToast();

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listRecentlyCompleted.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listTop3Slots.queryKey() });
    void queryClient.invalidateQueries(trpc.phases.listByProject.pathFilter());
    void queryClient.invalidateQueries(trpc.projects.list.pathFilter());
  }, [
    queryClient,
    trpc.tasks.listIncomplete,
    trpc.tasks.listRecentlyCompleted,
    trpc.tasks.listTop3Slots,
    trpc.phases.listByProject,
    trpc.projects.list,
  ]);

  const uncompleteMutation = useMutation(
    trpc.tasks.uncomplete.mutationOptions({ onSuccess: invalidate })
  );
  const uncompleteOccurrenceMutation = useMutation(
    trpc.recurrence.uncompleteOccurrence.mutationOptions({ onSuccess: invalidate })
  );

  return useCallback(
    (task: CompletableTask) => {
      if (!toast) return;
      const occurrence = occurrenceRef(task);
      toast.toast({
        message: "Completed",
        action: {
          label: "Undo",
          onClick: () => {
            if (occurrence) {
              uncompleteOccurrenceMutation.mutate(occurrence);
            } else {
              uncompleteMutation.mutate({ id: task.id });
            }
          },
        },
      });
    },
    [toast, uncompleteMutation, uncompleteOccurrenceMutation]
  );
}

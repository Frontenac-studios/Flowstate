"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { useTRPC } from "@/trpc/client";

/**
 * Phase/task mutations scoped to one project. Every mutation invalidates the
 * project's phase + task lists on success so the workspace tree stays current.
 */
export function useProjectMutations(projectId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: trpc.phases.listByProject.queryKey({ projectId }),
    });
    void queryClient.invalidateQueries({
      queryKey: trpc.tasks.listByProject.queryKey({ projectId }),
    });
  }, [queryClient, trpc.phases.listByProject, trpc.tasks.listByProject, projectId]);

  const onSuccess = () => invalidate();

  const createPhase = useMutation(trpc.phases.create.mutationOptions({ onSuccess }));
  const updatePhase = useMutation(trpc.phases.update.mutationOptions({ onSuccess }));
  const setPhaseComplete = useMutation(trpc.phases.setComplete.mutationOptions({ onSuccess }));
  const deletePhase = useMutation(trpc.phases.delete.mutationOptions({ onSuccess }));

  const createTask = useMutation(trpc.tasks.create.mutationOptions({ onSuccess }));
  const updateTask = useMutation(trpc.tasks.update.mutationOptions({ onSuccess }));
  const completeTask = useMutation(trpc.tasks.complete.mutationOptions({ onSuccess }));
  const uncompleteTask = useMutation(trpc.tasks.uncomplete.mutationOptions({ onSuccess }));
  const deleteTask = useMutation(trpc.tasks.delete.mutationOptions({ onSuccess }));
  // moveTask is used both for cross-phase moves and within-column reorder; the
  // reorder path awaits several mutateAsync calls, so it invalidates once here.
  const moveTask = useMutation(trpc.tasks.moveToPhase.mutationOptions({ onSuccess }));

  return {
    invalidate,
    createPhase,
    updatePhase,
    setPhaseComplete,
    deletePhase,
    createTask,
    updateTask,
    completeTask,
    uncompleteTask,
    deleteTask,
    moveTask,
  };
}

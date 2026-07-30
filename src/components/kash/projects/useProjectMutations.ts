"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { useTRPC, type RouterOutputs } from "@/trpc/client";

import { optimisticPatch, rollbackPatches } from "../plan/optimistic-cache";

type ProjectTaskRow = RouterOutputs["tasks"]["listByProject"][number];

/**
 * Phase/task mutations scoped to one project. Every mutation invalidates the
 * project's phase + task lists on success so the workspace tree stays current.
 */
export function useProjectMutations(projectId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const invalidateProject = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: trpc.phases.listByProject.queryKey({ projectId }),
    });
    void queryClient.invalidateQueries({
      queryKey: trpc.tasks.listByProject.queryKey({ projectId }),
    });
    void queryClient.invalidateQueries({
      queryKey: trpc.taskBulkImports.listByProject.queryKey({ projectId }),
    });
  }, [
    queryClient,
    trpc.phases.listByProject,
    trpc.tasks.listByProject,
    trpc.taskBulkImports.listByProject,
    projectId,
  ]);

  const invalidatePlan = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listTriageCandidates.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listTop3Slots.queryKey() });
  }, [
    queryClient,
    trpc.tasks.listIncomplete,
    trpc.tasks.listTriageCandidates,
    trpc.tasks.listTop3Slots,
  ]);

  const invalidateAll = useCallback(() => {
    invalidateProject();
    invalidatePlan();
  }, [invalidateProject, invalidatePlan]);

  const onSuccess = () => invalidateProject();

  // Optimistically flip a task's completedAt in the Miller column feed so the
  // row settles/reopens instantly; onError rolls back, onSettled reconciles.
  // Mirrors TaskRow's completion patch, keyed to the project's task list.
  const patchTaskCompletion = useCallback(
    async (id: string, completedAt: Date | null) => {
      const snapshot = await optimisticPatch<ProjectTaskRow[]>(
        queryClient,
        trpc.tasks.listByProject.queryKey({ projectId }),
        (old) => old.map((task) => (task.id === id ? { ...task, completedAt } : task))
      );
      return { snapshots: [snapshot] };
    },
    [queryClient, trpc.tasks.listByProject, projectId]
  );

  const createPhase = useMutation(trpc.phases.create.mutationOptions({ onSuccess }));
  const updatePhase = useMutation(trpc.phases.update.mutationOptions({ onSuccess }));
  const updatePhaseSilent = useMutation(trpc.phases.update.mutationOptions({}));
  const setPhaseComplete = useMutation(trpc.phases.setComplete.mutationOptions({ onSuccess }));
  const deletePhase = useMutation(trpc.phases.delete.mutationOptions({ onSuccess }));

  const createTask = useMutation(trpc.tasks.create.mutationOptions({ onSuccess }));
  const updateTask = useMutation(trpc.tasks.update.mutationOptions({ onSuccess }));
  const completeTask = useMutation(
    trpc.tasks.complete.mutationOptions({
      onMutate: ({ id }) => patchTaskCompletion(id, new Date()),
      onError: (_err, _vars, ctx) => rollbackPatches(queryClient, ctx?.snapshots),
      onSettled: () => invalidateProject(),
    })
  );
  const uncompleteTask = useMutation(
    trpc.tasks.uncomplete.mutationOptions({
      onMutate: ({ id }) => patchTaskCompletion(id, null),
      onError: (_err, _vars, ctx) => rollbackPatches(queryClient, ctx?.snapshots),
      onSettled: () => invalidateProject(),
    })
  );
  const deleteTask = useMutation(trpc.tasks.delete.mutationOptions({ onSuccess }));
  const moveTask = useMutation(trpc.tasks.moveToPhase.mutationOptions({ onSuccess }));
  // Silent variant for within-column reorder: several moves are awaited, then the
  // caller invalidates once (avoids N refetches / flicker per reorder).
  const moveTaskSilent = useMutation(trpc.tasks.moveToPhase.mutationOptions({}));

  const bulkCreateTasks = useMutation(
    trpc.taskBulkImports.bulkCreate.mutationOptions({ onSuccess: invalidateAll })
  );

  const undoBulkImport = useMutation(
    trpc.taskBulkImports.undo.mutationOptions({ onSuccess: invalidateAll })
  );

  return {
    invalidate: invalidateProject,
    invalidateAll,
    createPhase,
    updatePhase,
    updatePhaseSilent,
    setPhaseComplete,
    deletePhase,
    createTask,
    bulkCreateTasks,
    undoBulkImport,
    updateTask,
    completeTask,
    uncompleteTask,
    deleteTask,
    moveTask,
    moveTaskSilent,
  };
}

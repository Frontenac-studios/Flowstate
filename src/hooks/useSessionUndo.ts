"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

import type { ConfirmUndoFrame } from "@/lib/chat/confirm-undo";
import type { ProjectCategory } from "@/lib/projects/categories";
import { useTRPC } from "@/trpc/client";

export type TaskSnapshot = {
  id: string;
  title: string;
  priority: number;
  scheduledDate: string | null;
  bucketOverride: string | null;
  projectId: string | null;
  isTop3: boolean;
  top3Order: number | null;
  category: ProjectCategory;
  categoryUnresolved: boolean;
  tags?: string[];
};

type UndoFrame =
  | { type: "complete"; taskId: string; previousCompletedAt: Date | null }
  | { type: "uncomplete"; taskId: string }
  | { type: "delete"; snapshot: TaskSnapshot }
  | ConfirmUndoFrame;

const MAX_STACK = 20;

function pushFrame(stack: UndoFrame[], frame: UndoFrame) {
  stack.push(frame);
  if (stack.length > MAX_STACK) stack.shift();
}

export function useSessionUndo() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const stackRef = useRef<UndoFrame[]>([]);

  const invalidatePlan = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listTriageCandidates.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listTop3Slots.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listRecentlyCompleted.queryKey() });
    void queryClient.invalidateQueries(trpc.planning.getYearActivity.pathFilter());
    void queryClient.invalidateQueries(trpc.planning.getQuarterActivity.pathFilter());
    void queryClient.invalidateQueries(trpc.protectedBlocks.listForWeek.pathFilter());
    void queryClient.invalidateQueries(trpc.weekDayPriorities.listForWeek.pathFilter());
    void queryClient.invalidateQueries(trpc.projects.list.pathFilter());
    void queryClient.invalidateQueries(trpc.phases.listByProject.pathFilter());
  }, [
    queryClient,
    trpc.tasks.listIncomplete,
    trpc.tasks.listTriageCandidates,
    trpc.tasks.listTop3Slots,
    trpc.tasks.listRecentlyCompleted,
    trpc.planning.getYearActivity,
    trpc.planning.getQuarterActivity,
    trpc.protectedBlocks.listForWeek,
    trpc.weekDayPriorities.listForWeek,
    trpc.projects.list,
    trpc.phases.listByProject,
  ]);

  const completeMutation = useMutation(
    trpc.tasks.complete.mutationOptions({ onSuccess: invalidatePlan })
  );
  const uncompleteMutation = useMutation(
    trpc.tasks.uncomplete.mutationOptions({ onSuccess: invalidatePlan })
  );
  const restoreMutation = useMutation(
    trpc.tasks.createFromSnapshot.mutationOptions({ onSuccess: invalidatePlan })
  );
  const updateTaskMutation = useMutation(
    trpc.tasks.update.mutationOptions({ onSuccess: invalidatePlan })
  );
  const deleteTaskMutation = useMutation(
    trpc.tasks.delete.mutationOptions({ onSuccess: invalidatePlan })
  );
  const pinTop3Mutation = useMutation(
    trpc.tasks.pinTop3.mutationOptions({ onSuccess: invalidatePlan })
  );
  const unpinTop3Mutation = useMutation(
    trpc.tasks.unpinTop3.mutationOptions({ onSuccess: invalidatePlan })
  );
  const scheduleMutation = useMutation(
    trpc.tasks.scheduleToDate.mutationOptions({ onSuccess: invalidatePlan })
  );
  const removeProtectedBlockMutation = useMutation(
    trpc.protectedBlocks.remove.mutationOptions({ onSuccess: invalidatePlan })
  );
  const unpinPriorityMutation = useMutation(
    trpc.weekDayPriorities.unpin.mutationOptions({ onSuccess: invalidatePlan })
  );
  const pinPriorityMutation = useMutation(
    trpc.weekDayPriorities.pin.mutationOptions({ onSuccess: invalidatePlan })
  );
  const deleteProjectMutation = useMutation(
    trpc.projects.delete.mutationOptions({ onSuccess: invalidatePlan })
  );
  const updatePhaseMutation = useMutation(
    trpc.phases.update.mutationOptions({ onSuccess: invalidatePlan })
  );
  const moveToPhaseMutation = useMutation(
    trpc.tasks.moveToPhase.mutationOptions({ onSuccess: invalidatePlan })
  );

  const pushComplete = useCallback((taskId: string, previousCompletedAt: Date | null) => {
    pushFrame(stackRef.current, { type: "complete", taskId, previousCompletedAt });
  }, []);

  const pushUncomplete = useCallback((taskId: string) => {
    pushFrame(stackRef.current, { type: "uncomplete", taskId });
  }, []);

  const pushDelete = useCallback((snapshot: TaskSnapshot) => {
    pushFrame(stackRef.current, { type: "delete", snapshot });
  }, []);

  const pushConfirmUndo = useCallback((frames: readonly ConfirmUndoFrame[]) => {
    for (const frame of frames) {
      pushFrame(stackRef.current, frame);
    }
  }, []);

  const undoConfirmFrame = useCallback(
    async (frame: ConfirmUndoFrame) => {
      switch (frame.type) {
        case "complete":
          await uncompleteMutation.mutateAsync({ id: frame.taskId });
          return;
        case "delete":
          await restoreMutation.mutateAsync(frame.snapshot);
          return;
        case "edit_task":
          await updateTaskMutation.mutateAsync({
            id: frame.taskId,
            title: frame.previous.title,
            priority: frame.previous.priority,
            projectId: frame.previous.projectId,
            phaseId: frame.previous.phaseId,
            category: frame.previous.category,
          });
          await scheduleMutation.mutateAsync({
            id: frame.taskId,
            scheduledDate: frame.previous.scheduledDate,
          });
          return;
        case "reschedule":
          for (const row of frame.assignments) {
            await scheduleMutation.mutateAsync({
              id: row.taskId,
              scheduledDate: row.previousScheduledDate,
            });
          }
          return;
        case "create_tasks":
          for (const taskId of frame.taskIds) {
            await deleteTaskMutation.mutateAsync({ id: taskId });
          }
          return;
        case "set_top3":
          for (const slot of frame.slots) {
            if (slot.previousIsTop3 && slot.previousTop3Order) {
              await pinTop3Mutation.mutateAsync({
                id: slot.taskId,
                slot: slot.previousTop3Order as 1 | 2 | 3,
              });
            } else {
              await unpinTop3Mutation.mutateAsync({ id: slot.taskId });
            }
            await scheduleMutation.mutateAsync({
              id: slot.taskId,
              scheduledDate: slot.previousScheduledDate,
            });
          }
          return;
        case "create_protected_blocks":
          for (const blockId of frame.blockIds) {
            await removeProtectedBlockMutation.mutateAsync({ id: blockId });
          }
          return;
        case "set_day_priorities":
          for (const row of frame.rows) {
            if (row.previousPriorityOrder == null) {
              await unpinPriorityMutation.mutateAsync({
                taskId: row.taskId,
                scheduledDate: row.scheduledDate,
              });
            } else {
              await pinPriorityMutation.mutateAsync({
                taskId: row.taskId,
                scheduledDate: row.scheduledDate,
                slot: row.previousPriorityOrder as 1 | 2 | 3,
              });
            }
          }
          return;
        case "create_projects":
          for (const projectId of frame.projectIds) {
            await deleteProjectMutation.mutateAsync({ id: projectId });
          }
          return;
        case "edit_phase":
          await updatePhaseMutation.mutateAsync({
            id: frame.phaseId,
            name: frame.previous.name,
            description: frame.previous.description,
            startDate: frame.previous.startDate,
            endDate: frame.previous.endDate,
          });
          return;
        case "move_task_to_phase":
          await moveToPhaseMutation.mutateAsync({
            id: frame.taskId,
            phaseId: frame.previousPhaseId,
          });
          return;
        case "replan_project_dates":
          for (const phase of frame.phases) {
            await updatePhaseMutation.mutateAsync({
              id: phase.phaseId,
              startDate: phase.previousStartDate,
              endDate: phase.previousEndDate,
            });
          }
          return;
        default: {
          const _exhaustive: never = frame;
          void _exhaustive;
        }
      }
    },
    [
      deleteProjectMutation,
      deleteTaskMutation,
      moveToPhaseMutation,
      pinPriorityMutation,
      pinTop3Mutation,
      removeProtectedBlockMutation,
      restoreMutation,
      scheduleMutation,
      uncompleteMutation,
      unpinPriorityMutation,
      unpinTop3Mutation,
      updatePhaseMutation,
      updateTaskMutation,
    ]
  );

  const undo = useCallback(async () => {
    const frame = stackRef.current.pop();
    if (!frame) return;

    if (frame.type === "complete") {
      await uncompleteMutation.mutateAsync({ id: frame.taskId });
      return;
    }

    if (frame.type === "uncomplete") {
      await completeMutation.mutateAsync({ id: frame.taskId });
      return;
    }

    if (frame.type === "delete") {
      await restoreMutation.mutateAsync(frame.snapshot);
      return;
    }

    await undoConfirmFrame(frame);
  }, [completeMutation, restoreMutation, uncompleteMutation, undoConfirmFrame]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== "z" || e.shiftKey) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }

      e.preventDefault();
      void undo();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo]);

  return { pushComplete, pushUncomplete, pushDelete, pushConfirmUndo, undo };
}

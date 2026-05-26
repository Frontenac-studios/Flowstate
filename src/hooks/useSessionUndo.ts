"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

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
};

type UndoFrame =
  | { type: "complete"; taskId: string; previousCompletedAt: Date | null }
  | { type: "delete"; snapshot: TaskSnapshot };

const MAX_STACK = 20;

export function useSessionUndo() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const stackRef = useRef<UndoFrame[]>([]);

  const invalidateToday = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listToday.queryKey() });
  }, [queryClient, trpc.tasks.listToday]);

  const uncompleteMutation = useMutation(
    trpc.tasks.uncomplete.mutationOptions({
      onSuccess: invalidateToday,
    })
  );

  const restoreMutation = useMutation(
    trpc.tasks.createFromSnapshot.mutationOptions({
      onSuccess: invalidateToday,
    })
  );

  const pushComplete = useCallback((taskId: string, previousCompletedAt: Date | null) => {
    stackRef.current.push({ type: "complete", taskId, previousCompletedAt });
    if (stackRef.current.length > MAX_STACK) {
      stackRef.current.shift();
    }
  }, []);

  const pushDelete = useCallback((snapshot: TaskSnapshot) => {
    stackRef.current.push({ type: "delete", snapshot });
    if (stackRef.current.length > MAX_STACK) {
      stackRef.current.shift();
    }
  }, []);

  const undo = useCallback(async () => {
    const frame = stackRef.current.pop();
    if (!frame) return;

    if (frame.type === "complete") {
      await uncompleteMutation.mutateAsync({ id: frame.taskId });
      return;
    }

    await restoreMutation.mutateAsync(frame.snapshot);
  }, [restoreMutation, uncompleteMutation]);

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

  return { pushComplete, pushDelete, undo };
}

"use client";

import { useEffect, useRef, type MutableRefObject } from "react";

export type StartTimeEntryFn = (input: { taskId: string }) => Promise<{ entryId: string }>;

type Options = {
  taskId: string | null;
  startTimeEntry: StartTimeEntryFn;
  onSessionStart?: () => void;
};

export function useFocusTimeEntry({
  taskId,
  startTimeEntry,
  onSessionStart,
}: Options): MutableRefObject<string | null> {
  const entryIdRef = useRef<string | null>(null);
  const startedForTaskIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!taskId) return;
    if (startedForTaskIdRef.current === taskId) return;

    startedForTaskIdRef.current = taskId;
    let cancelled = false;

    entryIdRef.current = null;
    onSessionStart?.();

    void startTimeEntry({ taskId }).then(({ entryId }) => {
      if (!cancelled) entryIdRef.current = entryId;
    });

    return () => {
      cancelled = true;
      if (startedForTaskIdRef.current === taskId) {
        startedForTaskIdRef.current = null;
      }
    };
  }, [taskId, startTimeEntry, onSessionStart]);

  return entryIdRef;
}

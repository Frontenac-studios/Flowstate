"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Shared selection state for the one D5 model — click selects (highlight),
 * arrows move, Escape clears, `Cmd+Shift+D` completes the selected task. Holds a
 * single `selectedTaskId` and auto-clears it when the task leaves the visible
 * set (completed, moved off-surface, refetched away). Movement itself is pure
 * and lives per-surface (`moveInList` for the flat Plan list, `moveWeekSelection`
 * for the 2D Week grid), since the two surfaces navigate differently; this hook
 * owns only the state and the clear-on-disappear guard.
 */
export function useTaskSelection(visibleIds: string[]) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const idSet = useMemo(() => new Set(visibleIds), [visibleIds]);

  useEffect(() => {
    if (selectedTaskId !== null && !idSet.has(selectedTaskId)) {
      setSelectedTaskId(null);
    }
  }, [idSet, selectedTaskId]);

  const select = useCallback((taskId: string | null) => setSelectedTaskId(taskId), []);
  const clear = useCallback(() => setSelectedTaskId(null), []);

  return { selectedTaskId, select, clear };
}

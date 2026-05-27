import { startedOnLocalDay } from "@/lib/nudges/local-time";

import type { EodFocusBar, TimeEntryFocusInput } from "./types";

export const EOD_FOCUS_CHART_MAX = 8;

export type AggregateFocusResult = {
  bars: EodFocusBar[];
  totalCount: number;
};

export function aggregateFocusToday(params: {
  entries: TimeEntryFocusInput[];
  taskTitles: Map<string, string>;
  localDate: string;
  tzOffsetMinutes: number;
  now?: Date;
}): AggregateFocusResult {
  const { entries, taskTitles, localDate, tzOffsetMinutes } = params;
  const now = params.now ?? new Date();
  const secondsByTask = new Map<string, number>();

  for (const entry of entries) {
    if (!startedOnLocalDay(entry.startedAt, localDate, tzOffsetMinutes)) continue;

    const end = entry.endedAt ?? now;
    const deltaMs = Math.max(0, end.getTime() - entry.startedAt.getTime());
    const seconds = Math.floor(deltaMs / 1000);
    if (seconds <= 0) continue;

    secondsByTask.set(entry.taskId, (secondsByTask.get(entry.taskId) ?? 0) + seconds);
  }

  const all: EodFocusBar[] = Array.from(secondsByTask.entries())
    .map(([taskId, seconds]) => ({
      taskId,
      title: taskTitles.get(taskId) ?? "Task",
      seconds,
    }))
    .sort((a, b) => b.seconds - a.seconds);

  return {
    bars: all.slice(0, EOD_FOCUS_CHART_MAX),
    totalCount: all.length,
  };
}

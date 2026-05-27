import { datesInIsoWeek, startOfLocalDay, toISODateString } from "@/lib/dates/local-day";

import { deriveBucket } from "./derive-bucket";
import { matchesTodayList } from "./matches-today-list";
import type { PlanTask } from "./partition-plan-tasks";

export type NamedDaysPartition<T> = {
  today: T[];
  tomorrow: T[];
  /** Mon–Sun ISO dates for the current calendar week. */
  byWeekdayIso: Record<string, T[]>;
  later: T[];
};

export function emptyNamedDaysPartition<T>(weekIsos: string[]): NamedDaysPartition<T> {
  const byWeekdayIso: Record<string, T[]> = {};
  for (const iso of weekIsos) {
    byWeekdayIso[iso] = [];
  }
  return { today: [], tomorrow: [], byWeekdayIso, later: [] };
}

export function partitionNamedDays<T extends PlanTask>(
  tasks: T[],
  now: Date = new Date()
): NamedDaysPartition<T> {
  const todayIso = toISODateString(startOfLocalDay(now));
  const weekIsos = datesInIsoWeek(now).map(toISODateString);
  const weekIsoSet = new Set(weekIsos);

  const out = emptyNamedDaysPartition<T>(weekIsos);

  for (const task of tasks) {
    if (matchesTodayList(task, todayIso)) {
      out.today.push(task);
      continue;
    }

    const bucket = deriveBucket(task, now);
    if (bucket === "tomorrow") {
      out.tomorrow.push(task);
      continue;
    }
    if (bucket === "later") {
      out.later.push(task);
      continue;
    }

    const iso = task.scheduledDate;
    if (iso && weekIsoSet.has(iso)) {
      out.byWeekdayIso[iso]?.push(task);
      continue;
    }

    out.later.push(task);
  }

  return out;
}

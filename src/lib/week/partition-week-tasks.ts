import {
  datesInIsoWeek,
  endOfIsoWeekSunday,
  isDateInIsoWeek,
  toISODateString,
} from "@/lib/dates/local-day";

export type WeekPlanTask = {
  scheduledDate: string | null;
};

export type WeekPartition<T> = {
  /** Unscheduled (null date) — staged for placement into this week. */
  inbox: T[];
  byDate: Record<string, T[]>;
  /** Scheduled beyond this week — the "someday / later" backlog. */
  later: T[];
};

export function partitionWeekTasks<T extends WeekPlanTask>(
  tasks: T[],
  now: Date = new Date()
): WeekPartition<T> {
  const weekDates = datesInIsoWeek(now).map(toISODateString);
  const byDate = Object.fromEntries(weekDates.map((iso) => [iso, [] as T[]])) as Record<
    string,
    T[]
  >;
  // ISO date strings (YYYY-MM-DD) compare lexicographically == chronologically.
  const weekEndIso = toISODateString(endOfIsoWeekSunday(now));

  const inbox: T[] = [];
  const later: T[] = [];

  for (const task of tasks) {
    if (task.scheduledDate === null) {
      inbox.push(task);
      continue;
    }

    if (isDateInIsoWeek(task.scheduledDate, now)) {
      const bucket = byDate[task.scheduledDate];
      if (bucket) bucket.push(task);
      continue;
    }

    // Scheduled outside this week: future dates become the Later backlog;
    // past dates (overdue) are surfaced through triage, not here.
    if (task.scheduledDate > weekEndIso) {
      later.push(task);
    }
  }

  return { inbox, byDate, later };
}

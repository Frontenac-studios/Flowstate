import { datesInIsoWeek, isDateInIsoWeek, toISODateString } from "@/lib/dates/local-day";

export type WeekPlanTask = {
  scheduledDate: string | null;
};

export type WeekPartition<T> = {
  inbox: T[];
  byDate: Record<string, T[]>;
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

  const inbox: T[] = [];

  for (const task of tasks) {
    if (task.scheduledDate === null) {
      inbox.push(task);
      continue;
    }

    if (isDateInIsoWeek(task.scheduledDate, now)) {
      const bucket = byDate[task.scheduledDate];
      if (bucket) bucket.push(task);
    }
  }

  return { inbox, byDate };
}

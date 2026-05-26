import { startOfLocalDay, toISODateString } from "@/lib/dates/local-day";

import { deriveBucket, type Bucket } from "./derive-bucket";
import { matchesTodayList } from "./matches-today-list";

export type PlanTask = {
  scheduledDate: string | null;
  bucketOverride: string | null;
  completedAt: Date | null;
};

export type PartitionedPlanTasks<T> = {
  today: T[];
  tomorrow: T[];
  thisWeek: T[];
  later: T[];
};

export function partitionPlanTasks<T extends PlanTask>(
  tasks: T[],
  now: Date = new Date()
): PartitionedPlanTasks<T> {
  const todayIso = toISODateString(startOfLocalDay(now));

  const out: PartitionedPlanTasks<T> = {
    today: [],
    tomorrow: [],
    thisWeek: [],
    later: [],
  };

  for (const task of tasks) {
    if (matchesTodayList(task, todayIso)) {
      out.today.push(task);
      continue;
    }

    const bucket: Bucket = deriveBucket(task, now);
    if (bucket === "tomorrow") {
      out.tomorrow.push(task);
      continue;
    }
    if (bucket === "this_week") {
      out.thisWeek.push(task);
      continue;
    }

    out.later.push(task);
  }

  return out;
}

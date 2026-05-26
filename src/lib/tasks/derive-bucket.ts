import {
  addDays,
  endOfIsoWeekSunday,
  parseISODateString,
  startOfLocalDay,
  toISODateString,
} from "@/lib/dates/local-day";

export type Bucket = "today" | "tomorrow" | "this_week" | "later";

export type TaskBucketInput = {
  scheduledDate: string | null;
  bucketOverride: string | null;
};

/**
 * Derives the display bucket from hybrid scheduling fields.
 * Week boundary: ISO week ending Sunday (local timezone).
 *
 * Past `scheduled_date` values are not labeled "today". Overdue tasks that still
 * belong on the Today list (e.g. yesterday's carryovers) should be included via
 * `scheduledDate <= today` in list queries, not by mislabeling the bucket.
 */
export function deriveBucket(task: TaskBucketInput, now: Date = new Date()): Bucket {
  if (task.bucketOverride === "later") {
    return "later";
  }

  const today = startOfLocalDay(now);
  const todayIso = toISODateString(today);

  if (!task.scheduledDate) {
    return "today";
  }

  const scheduledIso = toISODateString(parseISODateString(task.scheduledDate));

  if (scheduledIso < todayIso) {
    return "later";
  }

  if (scheduledIso === todayIso) {
    return "today";
  }

  const tomorrowIso = toISODateString(addDays(today, 1));
  if (scheduledIso === tomorrowIso) {
    return "tomorrow";
  }

  const weekEndIso = toISODateString(endOfIsoWeekSunday(now));

  if (scheduledIso <= weekEndIso) {
    return "this_week";
  }

  return "later";
}

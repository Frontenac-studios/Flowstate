import {
  addDays,
  endOfIsoWeekSunday,
  startOfLocalDay,
  toISODateString,
} from "@/lib/dates/local-day";

import type { Bucket } from "./derive-bucket";

export type BucketSchedulingFields = {
  scheduledDate: string | null;
  bucketOverride: "later" | null;
};

/**
 * Converts a display bucket to the persisted hybrid scheduling fields.
 *
 * Note: `this_week` is date-based, so on some boundary days there may not be a
 * distinct calendar day available that derives back to `this_week` (for example,
 * Saturday when Sunday is already `tomorrow`). In that case, we schedule to the
 * ISO week end and accept that it derives to `tomorrow`.
 */
export function bucketToSchedulingFields(
  bucket: Bucket,
  now: Date = new Date()
): BucketSchedulingFields {
  const today = startOfLocalDay(now);
  const todayIso = toISODateString(today);

  if (bucket === "later") {
    return { scheduledDate: null, bucketOverride: "later" };
  }

  if (bucket === "today") {
    return { scheduledDate: todayIso, bucketOverride: null };
  }

  if (bucket === "tomorrow") {
    return { scheduledDate: toISODateString(addDays(today, 1)), bucketOverride: null };
  }

  const weekEnd = startOfLocalDay(endOfIsoWeekSunday(now));
  const candidate = startOfLocalDay(addDays(today, 2));
  const chosen = candidate <= weekEnd ? candidate : weekEnd;

  return { scheduledDate: toISODateString(chosen), bucketOverride: null };
}

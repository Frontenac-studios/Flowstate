import { isDateInIsoWeek } from "@/lib/dates/local-day";
import type { BucketMode } from "@/lib/settings/constants";

import type { Bucket } from "./derive-bucket";

export type TaskCreatedPulse = {
  bucket: Bucket;
  scheduledDate: string | null;
};

/** Resolves a section pulse key for day view (relative bucket name or ISO weekday). */
export function resolvePulseTarget(
  { bucket, scheduledDate }: TaskCreatedPulse,
  bucketMode: BucketMode,
  now: Date = new Date()
): string {
  if (bucket === "today") return "today";
  if (bucket === "tomorrow") return "tomorrow";
  if (bucket === "later") return "later";

  if (bucketMode === "named_days" && scheduledDate && isDateInIsoWeek(scheduledDate, now)) {
    return scheduledDate;
  }

  if (bucket === "this_week") return "this_week";
  return "today";
}

import { startOfIsoWeekMonday, toISODateString } from "@/lib/dates/local-day";

/** Monday ISO date key for the local week containing `ref`. */
export function currentWeekStartIso(ref: Date = new Date()): string {
  return toISODateString(startOfIsoWeekMonday(ref));
}

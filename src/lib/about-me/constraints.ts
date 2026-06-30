import { z } from "zod";

// 1 = Mon … 7 = Sun (ISO weekday), matching protected_block_templates.iso_weekday.
export const constraintScheduleSchema = z
  .object({
    days: z.array(z.number().int().min(1).max(7)).max(7),
    startMin: z.number().int().min(0).max(1440).optional(),
    endMin: z.number().int().min(0).max(1440).optional(),
  })
  .refine((s) => s.startMin == null || s.endMin == null || s.startMin < s.endMin, {
    message: "Start must be before end.",
    path: ["endMin"],
  });

export type ConstraintSchedule = z.infer<typeof constraintScheduleSchema>;

const DAY_ABBR = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** "Weekdays" / "Tue, Thu" / "Mon–Fri" — collapses consecutive runs of 3+ into ranges. */
export function formatWeekdays(days: readonly number[]): string {
  const uniq = Array.from(new Set(days))
    .filter((d) => d >= 1 && d <= 7)
    .sort((a, b) => a - b);
  if (uniq.length === 0) return "";
  if (uniq.length === 7) return "Every day";
  if (uniq.length === 5 && uniq.every((d, i) => d === i + 1)) return "Weekdays";
  if (uniq.length === 2 && uniq[0] === 6 && uniq[1] === 7) return "Weekends";

  const parts: string[] = [];
  let runStart = uniq[0];
  let prev = uniq[0];
  const flush = (end: number) => {
    if (runStart === end) parts.push(DAY_ABBR[runStart]);
    else if (end - runStart >= 2) parts.push(`${DAY_ABBR[runStart]}–${DAY_ABBR[end]}`);
    else parts.push(DAY_ABBR[runStart], DAY_ABBR[end]);
  };
  for (let i = 1; i < uniq.length; i++) {
    if (uniq[i] === prev + 1) {
      prev = uniq[i];
      continue;
    }
    flush(prev);
    runStart = uniq[i];
    prev = uniq[i];
  }
  flush(prev);
  return parts.join(", ");
}

/** Minutes-from-midnight → "8:00am" / "3:45pm". */
export function formatMinutes(totalMin: number): string {
  const h24 = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  const period = h24 < 12 ? "am" : "pm";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")}${period}`;
}

/** "Weekdays · 8:00am–6:00pm" — days and/or time, whichever the schedule carries. */
export function formatConstraintSchedule(schedule: ConstraintSchedule | null | undefined): string {
  if (!schedule) return "";
  const days = formatWeekdays(schedule.days);
  const time =
    schedule.startMin != null && schedule.endMin != null
      ? `${formatMinutes(schedule.startMin)}–${formatMinutes(schedule.endMin)}`
      : "";
  return [days, time].filter(Boolean).join(" · ");
}

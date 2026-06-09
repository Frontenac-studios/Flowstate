import { pinReferenceLocalDate } from "@/lib/nudges/local-time";

export type Top3PinDateFields = {
  top3PinnedAt: Date | null;
  scheduledDate: string | null;
};

export function isTop3ActiveForLocalDate(
  task: Top3PinDateFields,
  localDate: string,
  tzOffsetMinutes: number
): boolean {
  return (
    pinReferenceLocalDate(task.top3PinnedAt, task.scheduledDate, tzOffsetMinutes, localDate) ===
    localDate
  );
}

export function isExpiredTop3(
  task: Top3PinDateFields,
  localDate: string,
  tzOffsetMinutes: number
): boolean {
  return !isTop3ActiveForLocalDate(task, localDate, tzOffsetMinutes);
}

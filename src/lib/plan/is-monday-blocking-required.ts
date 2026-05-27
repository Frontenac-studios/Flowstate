/** True on Monday when the user has not made an entry choice for `localDate` (YYYY-MM-DD). */
export function isMondayBlockingRequired(
  localDate: string,
  mondayChoiceDate: string | null,
  now: Date = new Date()
): boolean {
  if (now.getDay() !== 1) return false;
  return mondayChoiceDate !== localDate;
}

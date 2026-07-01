import { getLocalDayOfMonth, getLocalDayOfWeek, getLocalHour } from "./local-time";
export function evaluateMonthlyReview(input: {
  now: Date;
  tzOffsetMinutes: number;
  alreadyNudgedThisMonth: boolean;
}) {
  const localHour = getLocalHour(input.now, input.tzOffsetMinutes);
  const dayOfMonth = getLocalDayOfMonth(input.now, input.tzOffsetMinutes);
  const dayOfWeek = getLocalDayOfWeek(input.now, input.tzOffsetMinutes);
  const isFirstSunday = dayOfWeek === 0 && dayOfMonth <= 7;
  return {
    shouldFire: isFirstSunday && localHour >= 10 && localHour < 19 && !input.alreadyNudgedThisMonth,
    localHour,
  };
}
export function templateMonthlyReviewMessage(): string {
  return "A calm moment to stargaze — see what keeps calling you in the Abyss and planning horizons.";
}
export function localMonthKey(now: Date, tzOffsetMinutes: number): string {
  const d = new Date(now.getTime() + tzOffsetMinutes * 60_000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

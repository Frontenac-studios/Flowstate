import { parseISODateString, toISODateString } from "@/lib/dates/local-day";

export function quarterPeriodForDate(isoDate: string): { start: string; end: string } {
  const d = parseISODateString(isoDate);
  const year = d.getFullYear();
  const month = d.getMonth();
  const quarterStartMonth = Math.floor(month / 3) * 3;
  const start = new Date(year, quarterStartMonth, 1);
  const end = new Date(year, quarterStartMonth + 3, 0);
  return { start: toISODateString(start), end: toISODateString(end) };
}

export function monthPeriodForDate(isoDate: string): { start: string; end: string } {
  const d = parseISODateString(isoDate);
  const year = d.getFullYear();
  const month = d.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start: toISODateString(start), end: toISODateString(end) };
}

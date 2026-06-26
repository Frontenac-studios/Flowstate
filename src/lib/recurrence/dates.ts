/** Parse YYYY-MM-DD as local calendar noon (stable for rrule.js). */
export function parseLocalIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function formatLocalIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function endOfLocalIsoDay(iso: string): Date {
  const d = parseLocalIsoDate(iso);
  d.setHours(23, 59, 59, 999);
  return d;
}

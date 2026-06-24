/**
 * Pure helpers for the manual time-entry UI (Phase 2.2).
 *
 * Parsing is forgiving on input ("90", "20m", "1h30m", "1h 30m", "1:30") and
 * strict on output: a value either parses to a positive whole number of seconds
 * or it is rejected (null). No Date handling lives here so the parsing stays
 * trivially unit-testable; the component assembles the started/ended window.
 */

const CLOCK_RE = /^(\d{1,2}):([0-5]?\d)$/;
const HM_RE = /^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?$/;

/**
 * Parse a human duration into whole seconds, or null if it isn't a positive
 * duration. Accepts:
 *  - bare minutes: "90" → 5400
 *  - h/m units: "20m", "1h", "1h30m", "1h 30m" → seconds
 *  - clock form: "1:30" (1h 30m), "0:45" (45m)
 */
export function parseDurationToSeconds(input: string): number | null {
  const raw = input.trim().toLowerCase();
  if (raw === "") return null;

  // Bare integer = minutes.
  if (/^\d+$/.test(raw)) {
    const mins = Number(raw);
    return mins > 0 ? mins * 60 : null;
  }

  const clock = raw.match(CLOCK_RE);
  if (clock) {
    const hours = Number(clock[1]);
    const mins = Number(clock[2]);
    const total = hours * 3600 + mins * 60;
    return total > 0 ? total : null;
  }

  const hm = raw.match(HM_RE);
  if (hm && (hm[1] !== undefined || hm[2] !== undefined)) {
    const hours = hm[1] ? Number(hm[1]) : 0;
    const mins = hm[2] ? Number(hm[2]) : 0;
    const total = hours * 3600 + mins * 60;
    return total > 0 ? total : null;
  }

  return null;
}

/**
 * Format whole seconds as a compact label. Under an hour reads "48m"; an hour
 * or more reads "1h 05m" (minutes zero-padded, matching the entry-list mockup).
 */
export function formatDuration(seconds: number): string {
  const totalMin = Math.max(0, Math.round(seconds / 60));
  if (totalMin < 60) return `${totalMin}m`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return `${hours}h ${String(mins).padStart(2, "0")}m`;
}

/**
 * Parse a 24-hour clock string ("08:00", "8:00") into hours/minutes, or null.
 * Hours must be 0-23; minutes 0-59 (enforced by the pattern).
 */
export function parseClockTime(input: string): { hours: number; minutes: number } | null {
  const m = input.trim().match(CLOCK_RE);
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours > 23) return null;
  return { hours, minutes };
}

/** Return a copy of `base` with the local time-of-day set to hours:minutes:00. */
export function applyClockToDate(base: Date, hours: number, minutes: number): Date {
  const next = new Date(base.getTime());
  next.setHours(hours, minutes, 0, 0);
  return next;
}

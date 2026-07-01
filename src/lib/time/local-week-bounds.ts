/**
 * UTC instants for [start, end) of the browser-local calendar week containing
 * `now`. The week runs Monday 00:00 → next Monday 00:00 in the caller's local
 * wall-clock, matching the Monday-start convention used by window-edge expiry
 * (`endOfWindowWeek`) and the week-draft surface — so a weekly roll-up covers
 * exactly the same span the user plans against.
 *
 * `tzOffsetMinutes` follows the app convention: minutes east of UTC
 * (`-new Date().getTimezoneOffset()`).
 */
export function localWeekUtcBounds(now: Date, tzOffsetMinutes: number): { start: Date; end: Date } {
  // Shift to the caller's local wall-clock, then read UTC fields off the shift.
  const local = new Date(now.getTime() + tzOffsetMinutes * 60_000);
  const dow = local.getUTCDay(); // 0 = Sun … 6 = Sat
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  // Local midnight of this week's Monday (Date.UTC normalizes day underflow).
  const mondayLocalMidnight = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() - daysFromMonday
  );
  // Convert local wall-clock back to absolute UTC instants.
  const startMs = mondayLocalMidnight - tzOffsetMinutes * 60_000;
  return {
    start: new Date(startMs),
    end: new Date(startMs + 7 * 86_400_000),
  };
}

/** ISO YYYY-MM-DD for the local calendar day of `instant` in `tzOffsetMinutes`. */
export function localIsoDateFromUtcInstant(instant: Date, tzOffsetMinutes: number): string {
  const local = new Date(instant.getTime() + tzOffsetMinutes * 60_000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, "0");
  const d = String(local.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

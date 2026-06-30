import type { CareCadence } from "./types";

// Cadence → recurrence prefill (D6). When a practice is added to the day, its cadence
// pre-fills the Repeat picker (overridable). We emit the recurrence engine's stored
// RRULE text WITHOUT the "RRULE:" prefix — src/lib/recurrence/expand.ts re-adds it via
// rrulestr(`RRULE:${rruleText}`). Returns null for "no repeat" (a one-off task).

/**
 * Map a Care cadence to the RRULE text the recurrence engine stores, or null for a
 * one-off (no repeat rule).
 *
 * - `daily`       → FREQ=DAILY
 * - `weekly`      → FREQ=WEEKLY
 * - `most_days`   → FREQ=DAILY — "soft": there is no every-other-day RRULE primitive, so
 *                   the gentle "most days" intent defaults to a plain daily repeat the
 *                   user can skip on off days. Display still labels it "most days".
 * - `when_needed` → null (one-off, no repeat)
 * - null/undefined (no cadence) → null
 */
export function cadenceToRRule(cadence: CareCadence | null | undefined): string | null {
  switch (cadence) {
    case "daily":
      return "FREQ=DAILY";
    case "weekly":
      return "FREQ=WEEKLY";
    case "most_days":
      return "FREQ=DAILY";
    case "when_needed":
    case null:
    case undefined:
      return null;
  }
}

/**
 * Idle-trim geometry (W2f). Pure so the "where does the running entry get cut,
 * and is anything left of it?" decision is unit-testable without a clock or a DB.
 *
 * When the desktop shell reports the machine sat idle past the threshold, a
 * running timer is offered "keep or trim". Trimming never deletes silently: the
 * running segment is ended at the instant idleness began and a fresh segment is
 * started on return, so the away time lands in the gap between two real entries
 * rather than being subtracted from one.
 */

/** No input for this long (default 10 min) makes the away time worth a prompt. */
export const IDLE_THRESHOLD_SECONDS = 10 * 60;

/**
 * A kept segment shorter than this after a trim isn't worth recording — the
 * whole running entry was idle, so it's dropped rather than left as a sliver.
 */
export const MIN_KEPT_SEGMENT_SECONDS = 1;

export type IdleTrim = {
  /** Instant to end the running entry at (idle start), clamped into the entry. */
  closeAt: Date;
  /** Whole seconds the kept segment [startedAt, closeAt] would record. */
  keptSeconds: number;
  /**
   * True when nothing meaningful precedes the idle — drop the entry entirely
   * instead of ending it at a sub-second sliver.
   */
  dropOriginal: boolean;
};

/**
 * Given a running entry's start, the current instant, and how long the machine
 * was idle, compute where to cut the entry. `awaySeconds` is floored and can't
 * push the cut before the entry began, so a machine idle longer than the timer
 * has run simply drops the whole (all-idle) entry.
 */
export function computeIdleTrim(startedAt: Date, now: Date, awaySeconds: number): IdleTrim {
  const startMs = startedAt.getTime();
  const nowMs = now.getTime();
  const awayMs = Math.max(0, Math.floor(awaySeconds)) * 1000;
  // Idle began `away` before now, but never before the entry itself started.
  const closeMs = Math.min(nowMs, Math.max(startMs, nowMs - awayMs));
  const keptSeconds = Math.max(0, Math.floor((closeMs - startMs) / 1000));
  return {
    closeAt: new Date(closeMs),
    keptSeconds,
    dropOriginal: keptSeconds < MIN_KEPT_SEGMENT_SECONDS,
  };
}

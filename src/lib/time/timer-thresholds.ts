/**
 * Timer threshold logic (W2d). Pure so the "did it just cross?" decision is
 * unit-testable without a clock or a notification backend.
 */

/** A timer running past this many seconds is almost certainly a forgot-to-stop. */
export const LONG_TIMER_SECONDS = 6 * 60 * 60; // 6h

/**
 * True when a timer has run long enough to be flagged. The alert fires at most
 * once per entry — the caller tracks which entry it has already notified — so this
 * only answers "is it long now?", not "did it cross this exact second?".
 */
export function isLongRunningTimer(
  elapsedSeconds: number,
  thresholdSeconds: number = LONG_TIMER_SECONDS
): boolean {
  return elapsedSeconds >= thresholdSeconds;
}

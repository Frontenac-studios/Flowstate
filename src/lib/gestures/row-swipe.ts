/**
 * Pure geometry for the D1/D6 row swipe model, shared by `useRowSwipe`:
 *
 * - Swipe **left** reveals a persistent Edit/Delete rail — it snaps open past the
 *   halfway point and snaps shut otherwise (same feel as the old reveal rail).
 * - Swipe **right** is a momentary fling: once the row is dragged past the
 *   completion threshold the complete action fires and the row springs back — it
 *   never rests open.
 */

/** Distance (px) a rightward swipe must travel to fire the complete action. */
export const SWIPE_COMPLETE_THRESHOLD_PX = 96;

/** How far past the threshold the fling can visually travel before it stops tracking. */
export const SWIPE_FLING_MAX_PX = SWIPE_COMPLETE_THRESHOLD_PX + 24;

/** Clamp a value into `[min, max]`. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Snap target for the left reveal rail: fully open past half, else closed. */
export function snapReveal(offset: number, maxWidth: number): number {
  if (maxWidth <= 0) return 0;
  return offset >= maxWidth / 2 ? maxWidth : 0;
}

/** Whether a rightward fling of `distance` px should fire the complete action. */
export function shouldTriggerComplete(
  distance: number,
  threshold: number = SWIPE_COMPLETE_THRESHOLD_PX
): boolean {
  return distance >= threshold;
}

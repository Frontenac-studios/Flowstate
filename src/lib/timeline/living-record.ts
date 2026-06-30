/**
 * Pure geometry for the Today timeline "living record": where the day is busy,
 * where it's open, where the next block would land, and where a gentle self-care
 * suggestion could sit (Today §6, design-prompt-today).
 */

export type Interval = { startMin: number; endMin: number };

const SLOT_MINUTES = 15;

function snapUp(min: number, slot = SLOT_MINUTES): number {
  return Math.ceil(min / slot) * slot;
}

/**
 * Free gaps within [from, to], given busy intervals (overlaps merged). Busy
 * intervals are clipped to the window first; the result is sorted and disjoint.
 */
export function openGaps(busy: ReadonlyArray<Interval>, from: number, to: number): Interval[] {
  if (to <= from) return [];
  const clipped = busy
    .filter((b) => b.endMin > from && b.startMin < to)
    .map((b) => ({ startMin: Math.max(b.startMin, from), endMin: Math.min(b.endMin, to) }))
    .sort((a, b) => a.startMin - b.startMin);

  const gaps: Interval[] = [];
  let cursor = from;
  for (const block of clipped) {
    if (block.startMin > cursor) gaps.push({ startMin: cursor, endMin: block.startMin });
    cursor = Math.max(cursor, block.endMin);
  }
  if (cursor < to) gaps.push({ startMin: cursor, endMin: to });
  return gaps;
}

/**
 * The largest open gap of at least `minLengthMin`, or null when nothing fits.
 * Used to place a single, unobtrusive self-care suggestion in the day's roomiest
 * stretch.
 */
export function largestOpenGap(
  busy: ReadonlyArray<Interval>,
  from: number,
  to: number,
  minLengthMin: number
): Interval | null {
  let best: Interval | null = null;
  for (const gap of openGaps(busy, from, to)) {
    const length = gap.endMin - gap.startMin;
    if (length >= minLengthMin && (best == null || length > best.endMin - best.startMin)) {
      best = gap;
    }
  }
  return best;
}

/**
 * The minute where the next block should drop: the first open slot at or after
 * `fromMin` (snapped to the 15-minute grid) with room for `durationMin` before
 * `toMin`. Returns null when the rest of the day is full.
 */
export function nextOpenSlotMin(
  busy: ReadonlyArray<Interval>,
  fromMin: number,
  toMin: number,
  durationMin: number
): number | null {
  const start = snapUp(Math.max(fromMin, 0));
  for (const gap of openGaps(busy, start, toMin)) {
    if (gap.endMin - gap.startMin >= durationMin) return gap.startMin;
  }
  return null;
}

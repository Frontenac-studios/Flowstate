const MINUTES_PER_DAY = 24 * 60;

/** The default visible slice of the timeline — six hours anchored to now (Today §6 Q1b). */
export const TIMELINE_VIEWPORT_MINUTES = 6 * 60;

/** Padding kept above the earliest / below the latest piece of content. */
const EDGE_PAD_MINUTES = 30;

/** How far before "now" the default viewport's top edge sits. */
const NOW_LEAD_MINUTES = 60;

export type TimelineRange = { startMin: number; endMin: number };

type WindowInput = {
  /** Working-hours start, minutes from midnight (e.g. 7 * 60). */
  dayStartMin: number;
  /** Working-hours end, minutes from midnight (e.g. 19 * 60). */
  dayEndMin: number;
  /** The day's blocks, so out-of-hours work stays reachable. */
  blocks: ReadonlyArray<{ startMin: number; endMin: number }>;
  /** Minutes-from-midnight of "now", or null when the day isn't today. */
  nowMin: number | null;
};

function clampDay(min: number): number {
  return Math.max(0, Math.min(MINUTES_PER_DAY, min));
}

/**
 * The full day range the Today timeline renders. Everything stays reachable by
 * scrolling: the range spans the working hours, every block, and "now", snapped
 * out to whole hours with a little padding. The *visible* slice defaults to six
 * hours around now (see {@link defaultViewportTopMin}) but the rest of the day
 * is always one scroll away — earlier/later hours are scrolled-away, never
 * clipped (Today §6 Q1/Q1b).
 */
export function computeTimelineRange({
  dayStartMin,
  dayEndMin,
  blocks,
  nowMin,
}: WindowInput): TimelineRange {
  let start = dayStartMin;
  let end = dayEndMin;

  for (const block of blocks) {
    if (block.startMin < start) start = block.startMin - EDGE_PAD_MINUTES;
    if (block.endMin > end) end = block.endMin + EDGE_PAD_MINUTES;
  }
  if (nowMin != null) {
    if (nowMin < start) start = nowMin - EDGE_PAD_MINUTES;
    if (nowMin > end) end = nowMin + EDGE_PAD_MINUTES;
  }

  // Snap out to whole hours so the hour grid lines up.
  start = clampDay(Math.floor(start / 60) * 60);
  end = clampDay(Math.ceil(end / 60) * 60);

  // Never shorter than the viewport, so the default six-hour scroll has room.
  if (end - start < TIMELINE_VIEWPORT_MINUTES) {
    end = Math.min(MINUTES_PER_DAY, start + TIMELINE_VIEWPORT_MINUTES);
    if (end - start < TIMELINE_VIEWPORT_MINUTES) {
      start = Math.max(0, end - TIMELINE_VIEWPORT_MINUTES);
    }
  }

  return { startMin: start, endMin: end };
}

/**
 * Minutes-from-midnight for the top edge of the default viewport: "now" parked
 * {@link NOW_LEAD_MINUTES} from the top so a little recent past and the next
 * several hours are in view, clamped so the six-hour window stays inside the
 * rendered range. Falls back to the range top when there's no "now" (not today).
 */
export function defaultViewportTopMin(range: TimelineRange, nowMin: number | null): number {
  if (nowMin == null) return range.startMin;
  const maxTop = Math.max(range.startMin, range.endMin - TIMELINE_VIEWPORT_MINUTES);
  return Math.max(range.startMin, Math.min(nowMin - NOW_LEAD_MINUTES, maxTop));
}

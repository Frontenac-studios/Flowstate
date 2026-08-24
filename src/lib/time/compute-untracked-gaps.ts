/**
 * End-of-day gap fill (W2c): find the untracked spans in a working day so the
 * close can ask "2:10–4:00 is untracked — what was that?".
 *
 * Pure and time-zone-agnostic: the caller passes the working window and every
 * instant as UTC epoch milliseconds. A running entry (endedAt null) counts as
 * covered up to `now`, and the window never extends past `now`, so a day still
 * in progress never proposes gaps in the future.
 */

export type LoggedSpan = {
  startedAt: Date;
  endedAt: Date | null;
};

export type UntrackedGap = {
  startedAt: Date;
  endedAt: Date;
};

export function computeUntrackedGaps(params: {
  entries: LoggedSpan[];
  /** Working-window start (UTC ms) — local day-start hour. */
  dayStartMs: number;
  /** Working-window end (UTC ms) — local day-end hour. */
  dayEndMs: number;
  /** Current instant (UTC ms); caps the window and closes running entries. */
  nowMs: number;
  /** A gap must be at least this long to surface. */
  minGapSeconds: number;
}): UntrackedGap[] {
  const windowEnd = Math.min(params.dayEndMs, params.nowMs);
  if (windowEnd <= params.dayStartMs) return [];

  const minGapMs = params.minGapSeconds * 1000;

  // Covered intervals, clamped to the window; running entries end at now.
  const covered = params.entries
    .map((e) => ({
      start: e.startedAt.getTime(),
      end: e.endedAt ? e.endedAt.getTime() : params.nowMs,
    }))
    .filter((iv) => iv.end > iv.start)
    .sort((a, b) => a.start - b.start);

  const gaps: UntrackedGap[] = [];
  let cursor = params.dayStartMs;

  for (const iv of covered) {
    if (iv.start > cursor) {
      const gapEnd = Math.min(iv.start, windowEnd);
      if (gapEnd - cursor >= minGapMs) {
        gaps.push({ startedAt: new Date(cursor), endedAt: new Date(gapEnd) });
      }
    }
    cursor = Math.max(cursor, iv.end);
    if (cursor >= windowEnd) break;
  }

  if (cursor < windowEnd && windowEnd - cursor >= minGapMs) {
    gaps.push({ startedAt: new Date(cursor), endedAt: new Date(windowEnd) });
  }

  return gaps;
}

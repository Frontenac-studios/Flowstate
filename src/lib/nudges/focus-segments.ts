/** Longest single focus segment from time entries (minutes). */
export function longestFocusSegmentMinutes(
  entries: ReadonlyArray<{ startedAt: Date; endedAt: Date | null }>,
  now: Date
): number {
  let longest = 0;
  for (const entry of entries) {
    const end = entry.endedAt ?? now;
    const minutes = Math.max(0, (end.getTime() - entry.startedAt.getTime()) / 60_000);
    if (minutes > longest) longest = minutes;
  }
  return Math.round(longest);
}

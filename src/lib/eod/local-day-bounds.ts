/** UTC instants for [start, end) of a browser-local calendar day. */
export function localDayUtcBounds(
  localDate: string,
  tzOffsetMinutes: number
): { start: Date; end: Date } {
  const [y, m, d] = localDate.split("-").map(Number);
  const startMs = Date.UTC(y, m - 1, d) - tzOffsetMinutes * 60_000;
  return {
    start: new Date(startMs),
    end: new Date(startMs + 86_400_000),
  };
}

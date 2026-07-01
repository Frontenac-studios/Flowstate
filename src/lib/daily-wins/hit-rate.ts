/** Gentle hit-rate copy for Care stats — informative, never streak framing. */
export function computeHitRate(daysWithWins: number, windowDays: number) {
  return {
    daysWithWins,
    windowDays,
    phrase: `wins on ${daysWithWins} of the last ${windowDays} days`,
  };
}

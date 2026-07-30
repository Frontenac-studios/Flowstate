/**
 * Move a single-list selection by `delta` rows (D5 arrow-key navigation on the
 * flat Plan/Today list). Clamps at the ends — no wrap. With nothing selected, a
 * downward step lands on the first row and an upward step on the last, so the
 * first arrow press always selects something.
 */
export function moveInList(
  orderedIds: string[],
  currentId: string | null,
  delta: number
): string | null {
  if (orderedIds.length === 0) return currentId;

  const index = currentId ? orderedIds.indexOf(currentId) : -1;
  if (index === -1) {
    return delta >= 0 ? orderedIds[0]! : orderedIds[orderedIds.length - 1]!;
  }

  const next = Math.min(Math.max(index + delta, 0), orderedIds.length - 1);
  return orderedIds[next]!;
}

/**
 * Compose the chat "applied" acknowledgement line for a create_task apply.
 * Titles are rendered as backtick code spans (prompt convention); the placement
 * descriptor (from formatCreateTaskPlacementSummary) is appended when every
 * created task shares the same placement.
 */
export function buildCreateTaskPlacementSummary(
  titles: readonly string[],
  placementLines: readonly string[]
): string | undefined {
  if (titles.length === 0) return undefined;

  const titleText = titles.map((title) => `\`${title}\``).join(", ");
  const uniquePlacements = Array.from(new Set(placementLines.filter((line) => line.length > 0)));

  if (uniquePlacements.length === 1) {
    return `Added ${titleText} · ${uniquePlacements[0]}`;
  }
  return `Added ${titleText}`;
}

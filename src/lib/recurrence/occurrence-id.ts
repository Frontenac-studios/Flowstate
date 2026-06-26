const PREFIX = "rec:";

/** Synthetic list-row id for a virtual recurring occurrence. */
export function makeOccurrenceId(recurrenceId: string, displayDate: string): string {
  return `${PREFIX}${recurrenceId}:${displayDate}`;
}

export function isOccurrenceId(id: string): boolean {
  return id.startsWith(PREFIX);
}

/** Parse a synthetic occurrence id back into recurrence + display date. */
export function parseOccurrenceId(
  id: string
): { recurrenceId: string; displayDate: string } | null {
  if (!isOccurrenceId(id)) return null;
  const rest = id.slice(PREFIX.length);
  const lastColon = rest.lastIndexOf(":");
  if (lastColon <= 0) return null;
  const recurrenceId = rest.slice(0, lastColon);
  const displayDate = rest.slice(lastColon + 1);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(displayDate)) return null;
  return { recurrenceId, displayDate };
}

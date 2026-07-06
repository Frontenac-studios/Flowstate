/** Parse `MM:SS` or `M:SS` into total seconds; returns null when invalid. */
export function parseDurationInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const colon = trimmed.indexOf(":");
  if (colon < 1) return null;

  const minutes = Number.parseInt(trimmed.slice(0, colon), 10);
  const seconds = Number.parseInt(trimmed.slice(colon + 1), 10);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
  if (seconds >= 60 || minutes < 0) return null;
  if (minutes * 60 + seconds <= 0) return null;

  return minutes * 60 + seconds;
}

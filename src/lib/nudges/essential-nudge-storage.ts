const DISMISSED_KINDS_KEY = "kash.essentialNudges.dismissedKinds";

function readLocal(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* ignore quota / private mode */
  }
}

/** Nudge kinds the user has dismissed, persisted so they don't reappear next session. */
export function readDismissedNudgeKinds(): Set<string> {
  const raw = readLocal(DISMISSED_KINDS_KEY);
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((k): k is string => typeof k === "string"));
    }
  } catch {
    /* ignore malformed */
  }
  return new Set();
}

export function addDismissedNudgeKind(kind: string): Set<string> {
  const next = readDismissedNudgeKinds();
  next.add(kind);
  writeLocal(DISMISSED_KINDS_KEY, JSON.stringify(Array.from(next)));
  return next;
}

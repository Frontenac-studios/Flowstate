const EXPLAINER_SEEN_KEY = "kash.dailyWins.explainerSeen";

function readLocal(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore quota / private mode */
  }
}

export function readDailyWinsExplainerSeen(): boolean {
  return readLocal(EXPLAINER_SEEN_KEY) === "1";
}

export function markDailyWinsExplainerSeen(): void {
  writeLocal(EXPLAINER_SEEN_KEY, "1");
}

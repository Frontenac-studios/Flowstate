const KEY = "kash.slipReplan.dismissed";

function readSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is string => typeof v === "string" && v.length > 0));
  } catch {
    return new Set();
  }
}

function writeSet(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    if (ids.size === 0) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, JSON.stringify(Array.from(ids)));
  } catch {
    /* ignore */
  }
}

/** Fingerprint slip offers so dismiss persists until the schedule changes. */
export function slipReplanFingerprint(
  projectId: string,
  phaseEnds: Readonly<Record<string, string | null>>
): string {
  const keys = Object.keys(phaseEnds).sort();
  const payload = keys.map((key) => `${key}:${phaseEnds[key] ?? ""}`).join("|");
  return `${projectId}:${payload}`;
}

export function isSlipReplanDismissed(fingerprint: string): boolean {
  return readSet().has(fingerprint);
}

export function dismissSlipReplan(fingerprint: string): void {
  const next = readSet();
  next.add(fingerprint);
  writeSet(next);
}

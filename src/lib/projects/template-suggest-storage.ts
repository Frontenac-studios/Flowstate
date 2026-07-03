const PENDING_KEY = "kash.templateSuggest.pending";

type Listener = () => void;
const listeners = new Set<Listener>();

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

function readPendingIds(): Set<string> {
  const raw = readLocal(PENDING_KEY);
  if (!raw) return new Set();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string" && id.length > 0));
  } catch {
    return new Set();
  }
}

function writePendingIds(ids: Set<string>): void {
  if (ids.size === 0) writeLocal(PENDING_KEY, null);
  else writeLocal(PENDING_KEY, JSON.stringify(Array.from(ids)));
}

function notifyListeners(): void {
  for (const listener of Array.from(listeners)) listener();
}

export function subscribeTemplateSuggestStorage(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** True when the template-suggest chip should render for this project. */
export function isTemplateSuggestPending(projectId: string): boolean {
  return readPendingIds().has(projectId);
}

/** Queue the chip after a project completes (§5 P3). Idempotent. */
export function queueTemplateSuggest(projectId: string): void {
  const ids = readPendingIds();
  if (ids.has(projectId)) return;
  ids.add(projectId);
  writePendingIds(ids);
  notifyListeners();
}

/** Dismiss or save-as-template — chip stays hidden until the next completion. */
export function resolveTemplateSuggest(projectId: string): void {
  const ids = readPendingIds();
  if (!ids.has(projectId)) return;
  ids.delete(projectId);
  writePendingIds(ids);
  notifyListeners();
}

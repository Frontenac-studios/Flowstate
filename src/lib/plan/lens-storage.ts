import { EMPTY_LENS, parseLens, serializeLens, type LensState } from "@/lib/tasks/lens";

/**
 * Per-surface lens scope. Lens state is a calm, opt-in view preference (VF5),
 * so it lives in `localStorage` like plan-mode and chat-rail state — never in
 * synced domain data. Today (day + week modes) shares one scope; This Week has
 * its own, so a lens turned on in one surface doesn't bleed into the other.
 */
export type LensScope = "today" | "this-week";

const KEY_PREFIX = "kash-lens:";

function storageKey(scope: LensScope): string {
  return `${KEY_PREFIX}${scope}`;
}

export function readLensState(scope: LensScope): LensState {
  if (typeof window === "undefined") return EMPTY_LENS;
  try {
    return parseLens(window.localStorage.getItem(storageKey(scope)));
  } catch {
    return EMPTY_LENS;
  }
}

export function writeLensState(scope: LensScope, state: LensState): void {
  if (typeof window === "undefined") return;
  try {
    const serialized = serializeLens(state);
    if (serialized) window.localStorage.setItem(storageKey(scope), serialized);
    else window.localStorage.removeItem(storageKey(scope));
  } catch {
    /* ignore quota / private mode */
  }
}

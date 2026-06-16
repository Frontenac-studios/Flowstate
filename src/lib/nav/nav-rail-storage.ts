const NAV_RAIL_PINNED_KEY = "kash.nav.railPinned";

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

export function readNavRailPinned(): boolean {
  return readLocal(NAV_RAIL_PINNED_KEY) === "true";
}

export function writeNavRailPinned(pinned: boolean): void {
  writeLocal(NAV_RAIL_PINNED_KEY, pinned ? "true" : null);
}

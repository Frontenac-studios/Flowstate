const CHAT_RAIL_OPEN_KEY = "kash.chat.railOpen";

/**
 * Per-session persistence for the right chat rail's open/closed state.
 * Uses sessionStorage so the rail is remembered while navigating within a
 * session but resets to the collapsed default on a fresh visit.
 */
export function readChatRailOpen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(CHAT_RAIL_OPEN_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeChatRailOpen(open: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (open) window.sessionStorage.setItem(CHAT_RAIL_OPEN_KEY, "true");
    else window.sessionStorage.removeItem(CHAT_RAIL_OPEN_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

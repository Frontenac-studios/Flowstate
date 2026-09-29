/**
 * Spec v3 Pa1 — the floating card every menu and popover sits on: white, 14px radius,
 * no border, a two-layer shadow that lifts it clearly off the page, 8px padding.
 */
export const OVERLAY_CARD = "rounded-card bg-surface p-2 shadow-menu";

/** A 36px menu row: 12px sides, 8px radius, 14/500 text, gray hover. */
export const MENU_ROW =
  "flex h-9 w-full items-center gap-3 rounded-row px-3 text-left text-[14px] font-medium text-ink outline-none transition-colors hover:bg-search-fill focus-visible:bg-search-fill disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none";

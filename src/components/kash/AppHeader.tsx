"use client";

import { formatHeaderDate } from "@/lib/dates/local-day";

import { OPEN_PALETTE_EVENT } from "./CommandPalette";
import { NAV_DRAWER_TOGGLE_EVENT } from "./LeftNavRail";
import { ChatToggleButton } from "./chat/ChatToggleButton";

/**
 * Neutral app-shell header: context + global actions only. Destinations live on
 * the left nav rail; section-specific controls (e.g. Today's Day/Week toggle)
 * are injected into the section's own content, not here.
 */
export function AppHeader() {
  return (
    <header
      // Frameless Tauri window (titleBarStyle "Overlay", hiddenTitle): the
      // header doubles as the drag region. Ignored by browsers; interactive
      // children (buttons) still receive their own clicks.
      data-tauri-drag-region
      className="glass-panel-strong mb-6 flex flex-wrap items-center gap-3 px-4 py-3 text-kash-ink"
    >
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent(NAV_DRAWER_TOGGLE_EVENT))}
        className="glass-icon-btn text-kash-ink-muted lg:hidden"
        aria-label="Open navigation"
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>
      <span className="font-semibold tracking-tight">Kash</span>
      <span className="text-kash-ink-muted" aria-hidden>
        ·
      </span>
      <time className="text-kash-ink-muted" dateTime={new Date().toISOString().slice(0, 10)}>
        {formatHeaderDate()}
      </time>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent(OPEN_PALETTE_EVENT))}
          className="glass-pill flex items-center gap-2 px-3 py-1.5 text-sm text-kash-ink-muted transition hover:text-kash-ink"
          aria-label="Open command palette"
          title="Search & commands (⌘K)"
        >
          Search
          <kbd className="font-mono text-[10px] text-kash-ink-muted" aria-hidden>
            ⌘K
          </kbd>
        </button>
        <ChatToggleButton />
      </div>
    </header>
  );
}

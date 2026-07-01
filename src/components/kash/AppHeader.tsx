"use client";

import { Menu, kashIconProps } from "@/components/kash/ui/icon";
import { formatHeaderDate } from "@/lib/dates/local-day";

import IconButton from "./ui/IconButton";
import { OPEN_PALETTE_EVENT } from "./chrome-events";
import { NAV_DRAWER_TOGGLE_EVENT } from "./LeftNavRail";
import { ChatToggleButton } from "./chat/ChatToggleButton";

export function AppHeader() {
  return (
    <header
      data-tauri-drag-region
      className="mb-6 flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface px-4 py-3 text-ink shadow-overlay"
    >
      <IconButton
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent(NAV_DRAWER_TOGGLE_EVENT))}
        className="lg:hidden"
        aria-label="Open navigation"
      >
        <Menu {...kashIconProps({ tokenSize: "md" })} aria-hidden />
      </IconButton>
      <span className="font-semibold tracking-tight">Kash</span>
      <span className="text-ink-muted" aria-hidden>
        ·
      </span>
      <time className="text-ink-muted" dateTime={new Date().toISOString().slice(0, 10)}>
        {formatHeaderDate()}
      </time>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent(OPEN_PALETTE_EVENT))}
          className="focus-visible:text-on-accent flex items-center gap-2 rounded-pill border border-border bg-surface px-3 py-1.5 text-sm text-ink-muted transition hover:text-ink focus:outline-none focus-visible:bg-ink"
          aria-label="Open command palette"
          title="Search & commands (⌘K)"
        >
          Search
          <kbd className="font-mono text-caption text-ink-muted" aria-hidden>
            ⌘K
          </kbd>
        </button>
        <ChatToggleButton />
      </div>
    </header>
  );
}

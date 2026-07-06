"use client";

import { usePathname } from "next/navigation";

import { Menu, kashIconProps } from "@/components/kash/ui/icon";
import { formatHeaderDate } from "@/lib/dates/local-day";

import IconButton from "./ui/IconButton";
import { OPEN_PALETTE_EVENT } from "./chrome-events";
import { NAV_DRAWER_TOGGLE_EVENT } from "./LeftNavRail";
import { ChatToggleButton } from "./chat/ChatToggleButton";

/** D14/V6: Today keeps the date in the page heading only — hide it from the title bar there. */
function showHeaderDate(pathname: string | null): boolean {
  if (!pathname) return true;
  return pathname !== "/today" && !pathname.startsWith("/today/");
}

export function AppHeader() {
  const pathname = usePathname();
  const includeDate = showHeaderDate(pathname);

  return (
    <header
      data-tauri-drag-region
      className="mb-header flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface px-card-x py-card-y text-ink shadow-overlay"
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
      {includeDate ? (
        <>
          <span className="text-ink-muted" aria-hidden>
            ·
          </span>
          <time className="text-ink-muted" dateTime={new Date().toISOString().slice(0, 10)}>
            {formatHeaderDate()}
          </time>
        </>
      ) : null}
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

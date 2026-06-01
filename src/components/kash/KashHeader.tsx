"use client";

import { formatHeaderDate } from "@/lib/dates/local-day";

import { OPEN_PALETTE_EVENT } from "./CommandPalette";
import { ChatToggleButton } from "./chat/ChatToggleButton";
import { usePlanMode } from "./plan/PlanProvider";

export function KashHeader() {
  const { mode: planMode, setMode } = usePlanMode();

  return (
    <header className="glass-panel-strong mb-6 flex flex-wrap items-center gap-3 px-4 py-3 text-kash-ink">
      <span className="font-semibold tracking-tight">Kash</span>
      <span className="text-kash-ink-muted" aria-hidden>
        ·
      </span>
      <time className="text-kash-ink-muted" dateTime={new Date().toISOString().slice(0, 10)}>
        {formatHeaderDate()}
      </time>
      <span className="text-kash-ink-muted" aria-hidden>
        ·
      </span>

      <div className="glass-pill flex text-sm" role="group" aria-label="Plan mode">
        <button
          type="button"
          onClick={() => setMode("day")}
          className={`rounded-full px-3 py-1 transition ${
            planMode === "day"
              ? "bg-kash-accent text-white"
              : "text-kash-ink-muted hover:text-kash-ink"
          }`}
          aria-pressed={planMode === "day"}
        >
          Day
        </button>
        <button
          type="button"
          onClick={() => setMode("week")}
          className={`rounded-full px-3 py-1 transition ${
            planMode === "week"
              ? "bg-kash-accent text-white"
              : "text-kash-ink-muted hover:text-kash-ink"
          }`}
          aria-pressed={planMode === "week"}
        >
          Week
        </button>
      </div>

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

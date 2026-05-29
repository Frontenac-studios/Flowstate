"use client";

import Link from "next/link";

import { formatHeaderDate } from "@/lib/dates/local-day";

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
        <ChatToggleButton />
        <Link
          href="/settings"
          className="glass-pill px-3 py-1.5 text-sm text-kash-ink-muted transition hover:text-kash-ink"
        >
          Settings
        </Link>
      </div>
    </header>
  );
}

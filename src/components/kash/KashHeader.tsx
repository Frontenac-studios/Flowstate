"use client";

import Link from "next/link";
import { useState } from "react";

import { formatHeaderDate } from "@/lib/dates/local-day";

export function KashHeader() {
  const [planMode, setPlanMode] = useState<"day" | "week">("day");
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <header className="glass-panel mb-6 flex flex-wrap items-center gap-3 px-4 py-3 text-kash-ink">
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
          onClick={() => setPlanMode("day")}
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
          disabled
          title="Mondays only — coming soon"
          className="cursor-not-allowed rounded-full px-3 py-1 text-kash-ink-muted opacity-50 transition"
          aria-pressed={false}
        >
          Week
        </button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => setChatOpen((v) => !v)}
          className="glass-pill px-3 py-1.5 text-sm text-kash-ink-muted transition hover:text-kash-ink"
          aria-pressed={chatOpen}
          aria-label="Toggle chat"
          title="Chat — coming in Phase 6"
        >
          Chat {chatOpen ? "☑" : "☐"}
        </button>
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

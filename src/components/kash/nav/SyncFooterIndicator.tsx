"use client";

import { useEffect, useRef, useState } from "react";

import { SyncFooterDetailPanel } from "@/components/kash/nav/SyncFooterDetailPanel";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { prefersReducedMotion } from "@/lib/animate/motion-tokens";

export function SyncFooterIndicator({ expanded }: { expanded: boolean }) {
  const { displayState, message, pendingCount, lastSyncTime, isSyncing, runSync } = useSyncStatus();
  const [panelOpen, setPanelOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReducedMotion(prefersReducedMotion());
  }, []);

  useEffect(() => {
    if (!panelOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setPanelOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanelOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [panelOpen]);

  if (displayState === "hidden") {
    return null;
  }

  const pulse = displayState === "syncing" && !reducedMotion;
  const showDot = displayState !== "synced";

  const dotClass =
    displayState === "syncError"
      ? "bg-critical"
      : displayState === "offline" || displayState === "pending"
        ? "bg-ink-muted"
        : "bg-accent";

  return (
    <div ref={rootRef} className="relative">
      {panelOpen ? (
        <SyncFooterDetailPanel
          displayState={displayState}
          message={message}
          pendingCount={pendingCount}
          lastSyncTime={lastSyncTime}
          isSyncing={isSyncing}
          onSyncNow={() => void runSync()}
        />
      ) : null}
      <button
        type="button"
        className="flex h-10 w-full items-center gap-2 px-3 text-left transition hover:bg-surface-2 focus:outline-none focus-visible:bg-surface-2"
        aria-expanded={panelOpen}
        aria-label="Sync status — expand for details"
        onClick={() => setPanelOpen((open) => !open)}
      >
        {showDot ? (
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass} ${pulse ? "sync-dot-pulse" : ""}`}
            aria-hidden
          />
        ) : (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink-faint" aria-hidden />
        )}
        {expanded ? <span className="text-caption text-ink-faint">Sync</span> : null}
      </button>
    </div>
  );
}

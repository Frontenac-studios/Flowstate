"use client";

import { useEffect, useState } from "react";

import { useSyncStatus } from "@/hooks/useSyncStatus";
import { prefersReducedMotion } from "@/lib/animate/motion-tokens";

export function SyncFooterIndicator({ expanded }: { expanded: boolean }) {
  const { displayState } = useSyncStatus();
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    setReducedMotion(prefersReducedMotion());
  }, []);

  if (displayState === "hidden" || displayState === "synced") {
    return null;
  }

  const pulse = displayState === "syncing" && !reducedMotion;

  const dotClass =
    displayState === "syncError"
      ? "bg-critical"
      : displayState === "offline" || displayState === "pending"
        ? "bg-ink-muted"
        : "bg-accent";

  return (
    <div className="flex h-10 items-center gap-2 px-3" role="status" aria-live="polite">
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass} ${pulse ? "sync-dot-pulse" : ""}`}
        aria-hidden
      />
      {expanded ? <span className="text-caption text-ink-faint">Sync</span> : null}
    </div>
  );
}

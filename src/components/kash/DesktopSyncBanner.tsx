"use client";

import { useSyncStatus } from "@/hooks/useSyncStatus";

function SyncDot({
  displayState,
}: {
  displayState: ReturnType<typeof useSyncStatus>["displayState"];
}) {
  switch (displayState) {
    case "offline":
      return <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />;
    case "synced":
      return <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />;
    case "syncError":
      return <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden />;
    case "pending":
      return <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />;
    default:
      return <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-kash-accent" aria-hidden />;
  }
}

export function DesktopSyncBanner() {
  const { displayState, message } = useSyncStatus();

  if (displayState === "hidden") return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-20 flex justify-center">
      <div
        className="glass-pill pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1 text-xs text-kash-ink-muted"
        role="status"
        aria-live="polite"
      >
        <SyncDot displayState={displayState} />
        {message}
      </div>
    </div>
  );
}

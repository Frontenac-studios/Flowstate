"use client";

import Button from "@/components/kash/ui/Button";
import { useSyncStatus } from "@/hooks/useSyncStatus";

export function SyncStatusPanel() {
  const { displayState, message, pendingCount, lastSyncTime, isSyncing, runSync } = useSyncStatus();

  if (displayState === "hidden") {
    return (
      <section className="rounded-[var(--radius-row)] border border-subtle bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Data & sync</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Offline sync status and manual sync are available in the Kash desktop app. The web app
          saves directly to your account.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[var(--radius-row)] border border-subtle bg-surface p-4">
      <h2 className="text-sm font-semibold text-ink">Data & sync</h2>
      <p className="mt-2 text-sm text-ink-muted">{message}</p>
      {pendingCount > 0 ? (
        <p className="mt-1 text-sm text-ink-muted">
          {pendingCount === 1 ? "1 change waiting" : `${pendingCount} changes waiting`}
        </p>
      ) : null}
      {lastSyncTime ? (
        <p className="mt-1 text-xs text-ink-faint">Last synced {lastSyncTime}</p>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        className="mt-4 text-sm"
        disabled={isSyncing || displayState === "offline"}
        onClick={() => void runSync()}
      >
        {isSyncing ? "Syncing…" : "Sync now"}
      </Button>
    </section>
  );
}

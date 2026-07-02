"use client";

import Button from "@/components/kash/ui/Button";
import type { SyncDisplayState } from "@/hooks/useSyncStatus";

type Props = {
  displayState: SyncDisplayState;
  message: string;
  pendingCount: number;
  lastSyncTime: string | null;
  isSyncing: boolean;
  onSyncNow: () => void;
};

const STATUS_LABEL: Record<Exclude<SyncDisplayState, "hidden" | "synced">, string> = {
  offline: "Offline",
  pending: "Pending",
  syncing: "Syncing",
  syncError: "Sync error",
};

export function SyncFooterDetailPanel({
  displayState,
  message,
  pendingCount,
  lastSyncTime,
  isSyncing,
  onSyncNow,
}: Props) {
  const statusLabel =
    displayState === "synced" ? "Synced" : STATUS_LABEL[displayState as keyof typeof STATUS_LABEL];

  return (
    <div
      className="absolute bottom-full left-2 right-2 mb-1 rounded-card border border-border bg-surface p-3 shadow-overlay"
      role="region"
      aria-label="Sync status"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-caption font-medium text-ink">{statusLabel}</span>
        {pendingCount > 0 ? (
          <span className="rounded-pill bg-surface-2 px-2 py-0.5 text-caption text-ink-muted">
            {pendingCount === 1 ? "1 pending" : `${pendingCount} pending`}
          </span>
        ) : null}
      </div>
      <p className="mt-1.5 text-caption leading-snug text-ink-muted">{message}</p>
      {lastSyncTime ? (
        <p className="mt-1 text-caption text-ink-faint">Last synced {lastSyncTime}</p>
      ) : null}
      <p className="mt-2 text-caption text-ink-faint">
        Conflicts resolve automatically — the most recent change wins.
      </p>
      <Button
        type="button"
        variant="ghost"
        className="mt-3 w-full text-caption"
        disabled={isSyncing || displayState === "offline"}
        onClick={onSyncNow}
      >
        {isSyncing ? "Syncing…" : "Sync now"}
      </Button>
    </div>
  );
}

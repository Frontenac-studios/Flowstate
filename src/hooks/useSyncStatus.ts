"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { isDesktopRuntime } from "@/lib/runtime/is-desktop";
import { useTRPC } from "@/trpc/client";

export type SyncDisplayState =
  | "offline"
  | "pending"
  | "syncing"
  | "synced"
  | "syncError"
  | "hidden";

export type SyncStatus = {
  displayState: SyncDisplayState;
  message: string;
  pendingCount: number;
  lastSyncTime: string | null;
};

const SYNC_RETRY_INTERVAL_MS = 5 * 60 * 1000;
const STATUS_POLL_MS = 30_000;
const MUTATION_DEBOUNCE_MS = 2_000;

function formatSyncMessage(
  displayState: SyncDisplayState,
  pendingCount: number,
  lastSyncTime: string | null
): string {
  switch (displayState) {
    case "offline":
      return "Saved locally — will sync when you're back online";
    case "pending":
      return pendingCount === 1
        ? "Saved locally — 1 change waiting to sync"
        : `Saved locally — ${pendingCount} changes waiting to sync`;
    case "syncing":
      return "Syncing…";
    case "synced":
      return lastSyncTime ? `Synced ${lastSyncTime}` : "Synced";
    case "syncError":
      return "Saved locally — sync failed, will retry";
    default:
      return "";
  }
}

export function useSyncStatus(): SyncStatus {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [offline, setOffline] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncError, setSyncError] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);
  const mutationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const desktop = mounted && isDesktopRuntime();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!desktop) return;

    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [desktop]);

  const statusQuery = useQuery({
    ...trpc.sync.status.queryOptions(),
    enabled: desktop,
    refetchInterval: (query) =>
      query.state.data?.pendingCount && query.state.data.pendingCount > 0 ? STATUS_POLL_MS : false,
  });

  const syncMutation = useMutation(trpc.sync.run.mutationOptions());
  const pendingCount = statusQuery.data?.pendingCount ?? 0;
  const sqliteMode = statusQuery.data?.mode === "sqlite";

  const runSync = useCallback(async () => {
    if (!desktop || syncingRef.current || !navigator.onLine || !sqliteMode) return;
    syncingRef.current = true;
    setIsSyncing(true);
    setSyncError(false);
    try {
      const result = await syncMutation.mutateAsync(undefined);
      if (!result.skipped) {
        if (result.errors.length > 0) {
          setSyncError(true);
        } else {
          setLastSyncTime(new Date().toLocaleTimeString());
          setSyncError(false);
        }
        void queryClient.invalidateQueries({ queryKey: trpc.sync.status.queryKey() });
      }
    } catch {
      setSyncError(true);
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [desktop, queryClient, sqliteMode, syncMutation, trpc.sync.status]);

  const runSyncRef = useRef(runSync);
  runSyncRef.current = runSync;

  useEffect(() => {
    if (!desktop || offline || !sqliteMode) return;
    void runSyncRef.current();
  }, [desktop, offline, sqliteMode]);

  useEffect(() => {
    if (!desktop) return;
    const onOnline = () => void runSyncRef.current();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [desktop]);

  useEffect(() => {
    if (!desktop || offline || pendingCount === 0) return;
    const intervalId = window.setInterval(() => {
      void runSyncRef.current();
    }, SYNC_RETRY_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [desktop, offline, pendingCount]);

  useEffect(() => {
    if (!desktop) return;

    const unsubscribe = queryClient.getMutationCache().subscribe((event) => {
      if (event.type !== "updated" || event.action.type !== "success") return;
      const mutationKey = event.mutation.options.mutationKey;
      if (JSON.stringify(mutationKey).includes("sync.run")) return;

      if (mutationDebounceRef.current) {
        clearTimeout(mutationDebounceRef.current);
      }
      mutationDebounceRef.current = setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: trpc.sync.status.queryKey() });
        void runSyncRef.current();
      }, MUTATION_DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (mutationDebounceRef.current) {
        clearTimeout(mutationDebounceRef.current);
      }
    };
  }, [desktop, queryClient, trpc.sync.status]);

  if (!desktop || statusQuery.isError || statusQuery.data?.mode === "postgres") {
    return {
      displayState: "hidden",
      message: "",
      pendingCount: 0,
      lastSyncTime: null,
    };
  }

  let displayState: SyncDisplayState;
  if (offline) {
    displayState = "offline";
  } else if (isSyncing) {
    displayState = "syncing";
  } else if (syncError) {
    displayState = "syncError";
  } else if (pendingCount > 0) {
    displayState = "pending";
  } else if (lastSyncTime) {
    displayState = "synced";
  } else {
    displayState = "syncing";
  }

  return {
    displayState,
    message: formatSyncMessage(displayState, pendingCount, lastSyncTime),
    pendingCount,
    lastSyncTime,
  };
}

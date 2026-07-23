"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  isSyncing: boolean;
  runSync: () => Promise<void>;
};

const SYNC_RETRY_INTERVAL_MS = 5 * 60 * 1000;
const STATUS_POLL_MS = 30_000;
const MUTATION_DEBOUNCE_MS = 2_000;

/**
 * Shared across every mount of this hook. The hook is instantiated in more than
 * one place (nav footer, settings panel), and a per-instance ref would let each
 * copy start its own sync for the same mutation.
 */
let syncInFlight = false;

/**
 * True when `mutationKey` is the key tRPC generates for `sync.run`.
 *
 * tRPC builds mutation keys as nested arrays — `sync.run` becomes
 * `[["sync","run"]]` — so a substring test for "sync.run" never matches. Compare
 * against the canonical key instead, so this keeps working if the key shape changes.
 */
export function isSameMutationKey(mutationKey: unknown, expectedKey: unknown): boolean {
  return JSON.stringify(mutationKey) === JSON.stringify(expectedKey);
}

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
    if (!desktop || syncingRef.current || syncInFlight || !navigator.onLine || !sqliteMode) return;
    syncingRef.current = true;
    syncInFlight = true;
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
      syncInFlight = false;
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

  // Memoized: mutationKey() returns a fresh array each call, which would
  // resubscribe the mutation-cache listener on every render.
  const syncRunKey = useMemo(() => trpc.sync.run.mutationKey(), [trpc.sync.run]);

  useEffect(() => {
    if (!desktop) return;

    const unsubscribe = queryClient.getMutationCache().subscribe((event) => {
      if (event.type !== "updated" || event.action.type !== "success") return;
      const mutationKey = event.mutation.options.mutationKey;
      // Without this, sync.run's own success re-arms the debounce and the hook
      // syncs forever.
      if (isSameMutationKey(mutationKey, syncRunKey)) return;

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
  }, [desktop, queryClient, syncRunKey, trpc.sync.status]);

  if (!desktop || statusQuery.isError || statusQuery.data?.mode === "postgres") {
    return {
      displayState: "hidden",
      message: "",
      pendingCount: 0,
      lastSyncTime: null,
      isSyncing: false,
      runSync: async () => {},
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
    isSyncing,
    runSync,
  };
}

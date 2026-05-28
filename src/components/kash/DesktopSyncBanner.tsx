"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { isDesktopRuntime } from "@/lib/runtime/is-desktop";
import { useTRPC } from "@/trpc/client";

export function DesktopSyncBanner() {
  const trpc = useTRPC();
  const [offline, setOffline] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const syncingRef = useRef(false);

  const syncMutation = useMutation(trpc.sync.run.mutationOptions());

  const runSync = useCallback(async () => {
    if (!isDesktopRuntime() || syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    try {
      const result = await syncMutation.mutateAsync(undefined);
      if (!result.skipped) {
        setLastSync(new Date().toLocaleTimeString());
      }
    } finally {
      syncingRef.current = false;
    }
  }, [syncMutation]);

  const runSyncRef = useRef(runSync);
  runSyncRef.current = runSync;

  useEffect(() => {
    if (!isDesktopRuntime()) return;

    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    if (!isDesktopRuntime() || offline) return;
    void runSyncRef.current();
  }, [offline]);

  useEffect(() => {
    if (!isDesktopRuntime()) return;
    const onOnline = () => void runSyncRef.current();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  if (!isDesktopRuntime()) return null;

  return (
    <div
      className="border-b border-white/40 bg-white/50 px-4 py-1.5 text-center text-xs text-kash-ink-muted backdrop-blur-sm"
      role="status"
    >
      {offline
        ? "Offline — changes save locally and sync when you reconnect."
        : lastSync
          ? `Synced at ${lastSync}`
          : "Desktop — syncing with your account…"}
    </div>
  );
}

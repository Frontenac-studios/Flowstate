"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { isDesktopRuntime } from "@/lib/runtime/is-desktop";
import { useTRPC } from "@/trpc/client";

export function DesktopSyncBanner() {
  const trpc = useTRPC();
  const [mounted, setMounted] = useState(false);
  const [offline, setOffline] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const syncingRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted || !isDesktopRuntime()) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-20 flex justify-center">
      <div
        className="glass-pill pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1 text-xs text-kash-ink-muted"
        role="status"
      >
        {offline ? (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
            Offline — changes save locally
          </>
        ) : lastSync ? (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
            Synced {lastSync}
          </>
        ) : (
          <>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-kash-accent" aria-hidden />
            Syncing…
          </>
        )}
      </div>
    </div>
  );
}

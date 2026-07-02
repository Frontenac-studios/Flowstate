"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { startOfLocalDay, toISODateString } from "@/lib/dates/local-day";
import { isDesktopRuntime } from "@/lib/runtime/is-desktop";
import { useTRPC } from "@/trpc/client";

const SWEEP_KEY = "kash.abyss.lastArchiveSweep";

/** B4 — desktop runs a once-per-local-day archive sweep (web keeps lazy archive on list()). */
export function useAbyssDailyArchiveSweep(): void {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const started = useRef(false);

  const sweep = useMutation(
    trpc.abyss.runArchiveSweep.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.abyss.list.queryKey() });
        void queryClient.invalidateQueries({ queryKey: trpc.abyss.listArchived.queryKey() });
      },
    })
  );

  useEffect(() => {
    if (!isDesktopRuntime() || started.current) return;
    started.current = true;

    const today = toISODateString(startOfLocalDay());
    try {
      if (window.localStorage.getItem(SWEEP_KEY) === today) return;
    } catch {
      /* private mode */
    }

    sweep.mutate(undefined, {
      onSuccess: () => {
        try {
          window.localStorage.setItem(SWEEP_KEY, today);
        } catch {
          /* ignore */
        }
      },
    });
  }, [sweep]);
}

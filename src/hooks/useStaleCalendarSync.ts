"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { isCalendarSyncStale } from "@/lib/calendar/oauth-redirect";
import { useTRPC } from "@/trpc/client";

/**
 * When a Google Calendar connection exists but has not synced within the
 * freshness window, trigger syncNow. Desktop has no Vercel cron; web benefits too
 * if the user opens Today/Week between cron ticks.
 */
export function useStaleCalendarSync(): void {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const inFlight = useRef(false);

  const { data: connection } = useQuery(trpc.calendar.connections.get.queryOptions());
  const syncMutation = useMutation(
    trpc.calendar.connections.syncNow.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.calendar.connections.get.queryKey() });
        void queryClient.invalidateQueries({
          queryKey: trpc.calendar.connections.getSyncStatus.queryKey(),
        });
        void queryClient.invalidateQueries(trpc.calendar.events.pathFilter());
      },
      onSettled: () => {
        inFlight.current = false;
      },
    })
  );

  const connected = connection?.connected === true;
  const selectedCount = connection?.selectedCalendarIds?.length ?? 0;
  const lastSyncedAt = connection?.lastSyncedAt ?? null;
  const mutate = syncMutation.mutate;

  useEffect(() => {
    if (!connected || selectedCount === 0) return;
    if (!isCalendarSyncStale(lastSyncedAt)) return;
    if (inFlight.current || syncMutation.isPending) return;

    inFlight.current = true;
    mutate();
  }, [connected, selectedCount, lastSyncedAt, mutate, syncMutation.isPending]);
}

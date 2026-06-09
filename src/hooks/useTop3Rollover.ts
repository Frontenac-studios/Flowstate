"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { useLocalCalendarDate } from "@/hooks/useLocalCalendarDate";
import { useTRPC } from "@/trpc/client";

function clientTzOffsetMinutes(): number {
  return -new Date().getTimezoneOffset();
}

export function useTop3Rollover() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const localDate = useLocalCalendarDate();
  const tzOffsetMinutes = clientTzOffsetMinutes();
  const inFlightRef = useRef(false);
  const lastRunKeyRef = useRef<string | null>(null);

  const clearMutation = useMutation(trpc.tasks.clearExpiredTop3.mutationOptions());

  useEffect(() => {
    const runKey = `${localDate}:${tzOffsetMinutes}`;
    if (inFlightRef.current || lastRunKeyRef.current === runKey) return;

    inFlightRef.current = true;
    lastRunKeyRef.current = runKey;

    void clearMutation
      .mutateAsync({ localDate, tzOffsetMinutes })
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: trpc.tasks.listTop3Slots.queryKey() });
        void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
        void queryClient.invalidateQueries({
          queryKey: trpc.tasks.listTriageCandidates.queryKey(),
        });
      })
      .finally(() => {
        inFlightRef.current = false;
      });
  }, [
    clearMutation,
    localDate,
    queryClient,
    trpc.tasks.listIncomplete,
    trpc.tasks.listTop3Slots,
    trpc.tasks.listTriageCandidates,
    tzOffsetMinutes,
  ]);
}

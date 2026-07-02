"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useLocalCalendarDate } from "@/hooks/useLocalCalendarDate";
import { useEssentialNudges } from "@/hooks/useEssentialNudges";
import {
  isMorningHandoffDismissedForDate,
  markMorningHandoffDismissedForDate,
} from "@/lib/nudges/morning-handoff-storage";
import { shouldShowMorningHandoff } from "@/lib/nudges/should-show-morning-handoff";
import { useTRPC } from "@/trpc/client";

import { MorningHandoffModal } from "./MorningHandoffModal";

export function MorningHandoffRunner() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const localDate = useLocalCalendarDate();
  const { data: settings } = useQuery(trpc.settings.get.queryOptions());
  const { opener } = useEssentialNudges();

  const enabled =
    settings?.assistanceEnabled !== false && (settings?.morningHandoff ?? "on") === "on";

  const seenQueryKey = trpc.nudges.hasMorningHandoffForDate.queryKey({ localDate });

  const { data: seenData } = useQuery(
    trpc.nudges.hasMorningHandoffForDate.queryOptions({ localDate }, { enabled })
  );

  const [dismissedLocally, setDismissedLocally] = useState(() =>
    isMorningHandoffDismissedForDate(localDate)
  );

  useEffect(() => {
    setDismissedLocally(isMorningHandoffDismissedForDate(localDate));
  }, [localDate]);

  const markSeen = useMutation({
    ...trpc.nudges.markMorningHandoffForDate.mutationOptions(),
    onSuccess: () => {
      queryClient.setQueryData(seenQueryKey, { seen: true });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: seenQueryKey });
    },
  });

  const shouldShow = useMemo(
    () =>
      shouldShowMorningHandoff({
        enabled,
        dismissedLocally,
        seen: seenData?.seen,
      }),
    [enabled, dismissedLocally, seenData?.seen]
  );

  const finish = useCallback(() => {
    markMorningHandoffDismissedForDate(localDate);
    setDismissedLocally(true);
    queryClient.setQueryData(seenQueryKey, { seen: true });
    markSeen.mutate({ localDate });
  }, [localDate, markSeen, queryClient, seenQueryKey]);

  if (!shouldShow) return null;

  return <MorningHandoffModal opener={opener} onSkip={finish} onBegin={finish} />;
}

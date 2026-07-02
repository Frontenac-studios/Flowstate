"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { useLocalCalendarDate } from "@/hooks/useLocalCalendarDate";
import { useEssentialNudges } from "@/hooks/useEssentialNudges";
import { useTRPC } from "@/trpc/client";

import { MorningHandoffModal } from "./MorningHandoffModal";

export function MorningHandoffRunner() {
  const trpc = useTRPC();
  const localDate = useLocalCalendarDate();
  const { data: settings } = useQuery(trpc.settings.get.queryOptions());
  const { opener } = useEssentialNudges();

  const enabled =
    settings?.assistanceEnabled !== false && (settings?.morningHandoff ?? "on") === "on";

  const { data: seenData } = useQuery(
    trpc.nudges.hasMorningHandoffForDate.queryOptions({ localDate }, { enabled })
  );

  const markSeen = useMutation(trpc.nudges.markMorningHandoffForDate.mutationOptions());

  const shouldShow = useMemo(
    () => enabled && !markSeen.isPending && seenData?.seen === false,
    [enabled, markSeen.isPending, seenData?.seen]
  );

  if (!shouldShow) return null;

  const finish = () => markSeen.mutate({ localDate });

  return <MorningHandoffModal opener={opener} onSkip={finish} onBegin={finish} />;
}

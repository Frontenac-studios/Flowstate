"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useWindDownHour } from "@/hooks/useWindDownHour";
import { evaluateTop3Stall, type Top3TaskInput } from "@/lib/nudges/evaluate-top3-stall";
import type { ProjectCategory } from "@/lib/projects/categories";
import { mergeDayBusySources } from "@/lib/calendar/merge-day-busy-sources";
import { computeTop3HoldSlot } from "@/lib/top3/compute-top3-hold-slot";
import {
  TOP3_HOLD_DECLINED_KEY_PREFIX,
  TOP3_HOLD_SOURCE,
  TOP3_SLIP_DISMISSED_KEY_PREFIX,
} from "@/lib/top3/constants";
import { computeMiddayCheckin, formatMiddayCheckinLine } from "@/lib/top3/midday-checkin";
import type { Top3MiddayCheckin } from "@/lib/settings/constants";
import { useTRPC } from "@/trpc/client";

import type { Top3SlotTask } from "@/components/kash/plan/Top3Slots";
import { startedOnLocalDay } from "@/lib/nudges/local-time";

function readDeclinedHold(localDate: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(`${TOP3_HOLD_DECLINED_KEY_PREFIX}${localDate}`) === "1";
  } catch {
    return false;
  }
}

function writeDeclinedHold(localDate: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${TOP3_HOLD_DECLINED_KEY_PREFIX}${localDate}`, "1");
  } catch {
    /* ignore */
  }
}

function readSlipDismissed(taskId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(`${TOP3_SLIP_DISMISSED_KEY_PREFIX}${taskId}`) === "1";
  } catch {
    return false;
  }
}

export function writeSlipDismissed(taskId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${TOP3_SLIP_DISMISSED_KEY_PREFIX}${taskId}`, "1");
  } catch {
    /* ignore */
  }
}

type HoldSlot = { startMin: number; endMin: number };

export type Top3AssuranceState = {
  holdGhost: HoldSlot | null;
  showHoldGhost: boolean;
  holdCategory: ProjectCategory;
  middayLine: string | null;
  slipTask: {
    id: string;
    title: string;
    top3Order: number;
    daysSlipped: number;
    pinReferenceDate: string;
  } | null;
  isOverCommitted: boolean;
  declineHold: () => void;
  confirmHold: () => void;
  dismissSlip: (taskId: string) => void;
  confirmingHold: boolean;
};

type Input = {
  localDate: string;
  tzOffsetMinutes: number;
  pinnedBySlot: Map<number, Top3SlotTask>;
  dayStartHour: number;
  dayEndHour: number;
  top3MiddayCheckin: Top3MiddayCheckin;
};

export function useTop3Assurance(input: Input): Top3AssuranceState {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [now, setNow] = useState(() => new Date());
  const [holdDeclined, setHoldDeclined] = useState(() => readDeclinedHold(input.localDate));
  const [slipDismissedIds, setSlipDismissedIds] = useState<Set<string>>(() => new Set());
  const [windDownHour] = useWindDownHour();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setHoldDeclined(readDeclinedHold(input.localDate));
  }, [input.localDate]);

  const overCommitInput = useMemo(
    () => ({ date: input.localDate, tzOffsetMinutes: input.tzOffsetMinutes }),
    [input.localDate, input.tzOffsetMinutes]
  );

  const { data: overCommit } = useQuery(
    trpc.weekOverCommit.isOverCommittedForDate.queryOptions(overCommitInput)
  );

  const { data: protectedBlocks = [] } = useQuery(
    trpc.protectedBlocks.listForDate.queryOptions({ date: input.localDate })
  );

  const { data: focusBlocks = [] } = useQuery(
    trpc.focusBlocks.listForDate.queryOptions({ date: input.localDate })
  );

  const { data: calendarConnection } = useQuery(trpc.calendar.connections.get.queryOptions());
  const calendarQueryEnabled =
    calendarConnection?.connected === true &&
    (calendarConnection.selectedCalendarIds?.length ?? 0) > 0;
  const { data: externalEvents = [] } = useQuery({
    ...trpc.calendar.events.listForDate.queryOptions({
      date: input.localDate,
      tzOffsetMinutes: input.tzOffsetMinutes,
    }),
    enabled: calendarQueryEnabled,
  });

  const { data: allTimeEntries = [] } = useQuery(trpc.timeEntries.listAllStarted.queryOptions());

  const timeEntriesToday = useMemo(
    () =>
      allTimeEntries.filter((e) =>
        startedOnLocalDay(e.startedAt, input.localDate, input.tzOffsetMinutes)
      ),
    [allTimeEntries, input.localDate, input.tzOffsetMinutes]
  );

  const pinnedTasks = useMemo(
    () =>
      ([1, 2, 3] as const)
        .map((slot) => input.pinnedBySlot.get(slot))
        .filter((task): task is Top3SlotTask => task != null),
    [input.pinnedBySlot]
  );

  const incompletePinned = pinnedTasks.filter((t) => t.completedAt == null);
  const hasTop3Hold = protectedBlocks.some((b) => b.source === TOP3_HOLD_SOURCE);

  const holdCategory = useMemo((): ProjectCategory => {
    const first = incompletePinned.find((t) => t.category && !t.categoryUnresolved);
    return first?.category ?? "professional";
  }, [incompletePinned]);

  const busyIntervals = useMemo(
    () =>
      mergeDayBusySources({
        focusBlocks,
        protectedBlocks,
        externalEvents,
      }),
    [focusBlocks, protectedBlocks, externalEvents]
  );

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const holdGhost = useMemo(
    () =>
      computeTop3HoldSlot(
        busyIntervals,
        Math.max(nowMinutes, input.dayStartHour * 60),
        input.dayEndHour * 60
      ),
    [busyIntervals, nowMinutes, input.dayStartHour, input.dayEndHour]
  );

  const showHoldGhost =
    incompletePinned.length > 0 &&
    !hasTop3Hold &&
    !holdDeclined &&
    holdGhost != null &&
    !(overCommit?.overCommitted ?? false);

  const middayLine = useMemo(() => {
    const state = computeMiddayCheckin({
      now,
      tzOffsetMinutes: input.tzOffsetMinutes,
      windDownHour,
      top3MiddayCheckinEnabled: input.top3MiddayCheckin === "on",
      isOverCommitted: overCommit?.overCommitted ?? false,
      pinnedCount: pinnedTasks.length,
      incompleteCount: incompletePinned.length,
    });
    return formatMiddayCheckinLine(state);
  }, [
    now,
    input.tzOffsetMinutes,
    input.top3MiddayCheckin,
    windDownHour,
    overCommit?.overCommitted,
    pinnedTasks.length,
    incompletePinned.length,
  ]);

  const slipTask = useMemo(() => {
    const top3Tasks: Top3TaskInput[] = pinnedTasks.map((t) => ({
      id: t.id,
      title: t.title,
      top3Order: t.top3Order,
      top3PinnedAt: t.top3PinnedAt,
      scheduledDate: t.scheduledDate,
      completedAt: t.completedAt,
    }));

    const evaluation = evaluateTop3Stall({
      now,
      tzOffsetMinutes: input.tzOffsetMinutes,
      localDate: input.localDate,
      top3Tasks,
      timeEntriesToday,
      timeEntries: allTimeEntries,
      alreadyNudgedToday: false,
    });

    const candidate = evaluation.slippedWithoutProgress.sort(
      (a, b) => a.top3Order - b.top3Order
    )[0];

    if (!candidate || slipDismissedIds.has(candidate.id) || readSlipDismissed(candidate.id)) {
      return null;
    }

    return candidate;
  }, [
    pinnedTasks,
    now,
    input.localDate,
    input.tzOffsetMinutes,
    allTimeEntries,
    timeEntriesToday,
    slipDismissedIds,
  ]);

  const confirmHoldMutation = useMutation(
    trpc.protectedBlocks.confirmTop3Hold.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.protectedBlocks.listForDate.queryKey({ date: input.localDate }),
        });
        void queryClient.invalidateQueries({
          queryKey: trpc.weekOverCommit.isOverCommittedForDate.queryKey(overCommitInput),
        });
      },
    })
  );

  const declineHold = useCallback(() => {
    writeDeclinedHold(input.localDate);
    setHoldDeclined(true);
  }, [input.localDate]);

  const confirmHold = useCallback(() => {
    if (!holdGhost) return;
    confirmHoldMutation.mutate({
      scheduledDate: input.localDate,
      category: holdCategory,
      startMin: holdGhost.startMin,
      endMin: holdGhost.endMin,
    });
  }, [confirmHoldMutation, holdCategory, holdGhost, input.localDate]);

  const dismissSlip = useCallback((taskId: string) => {
    writeSlipDismissed(taskId);
    setSlipDismissedIds((prev) => new Set(prev).add(taskId));
  }, []);

  return {
    holdGhost,
    showHoldGhost,
    holdCategory,
    middayLine,
    slipTask,
    isOverCommitted: overCommit?.overCommitted ?? false,
    declineHold,
    confirmHold,
    dismissSlip,
    confirmingHold: confirmHoldMutation.isPending,
  };
}

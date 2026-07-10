"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useLocalCalendarDate } from "@/hooks/useLocalCalendarDate";
import { useEssentialNudges } from "@/hooks/useEssentialNudges";
import { isOnboardingCompleted } from "@/lib/onboarding/onboarding-storage";
import {
  isMorningHandoffDismissedForDate,
  markMorningHandoffDismissedForDate,
} from "@/lib/nudges/morning-handoff-storage";
import { shouldShowMorningHandoff } from "@/lib/nudges/should-show-morning-handoff";
import type { ProjectCategory } from "@/lib/projects/categories";
import { formatCalendarMeetingSummary } from "@/lib/calendar/calendar-load-weight";
import { mergeDayBusySources } from "@/lib/calendar/merge-day-busy-sources";
import { computeTop3HoldSlot } from "@/lib/top3/compute-top3-hold-slot";
import { TOP3_HOLD_SOURCE } from "@/lib/top3/constants";
import { DEFAULT_DAY_END_HOUR, DEFAULT_DAY_START_HOUR } from "@/lib/settings/constants";
import type { HandoffPlanTask } from "@/lib/morning-handoff/handoff-task-filters";
import { useTRPC } from "@/trpc/client";

import { MorningHandoffModal } from "./MorningHandoffModal";
import { usePlanMode } from "./PlanProvider";

function clientTzOffsetMinutes(): number {
  return -new Date().getTimezoneOffset();
}

export function MorningHandoffRunner() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const localDate = useLocalCalendarDate();
  const { mondayBlocked } = usePlanMode();
  const tzOffsetMinutes = clientTzOffsetMinutes();
  const { data: settings } = useQuery(trpc.settings.get.queryOptions());
  const { opener } = useEssentialNudges();
  const dayStartHour = settings?.dayStartHour ?? DEFAULT_DAY_START_HOUR;
  const dayEndHour = settings?.dayEndHour ?? DEFAULT_DAY_END_HOUR;

  // V8: first-run onboarding owns the sheet until completed — don't double-stack.
  const onboardingDone = typeof window === "undefined" ? true : isOnboardingCompleted();

  const enabled =
    onboardingDone &&
    settings?.assistanceEnabled !== false &&
    (settings?.morningHandoff ?? "on") === "on";

  const seenQueryKey = trpc.nudges.hasMorningHandoffForDate.queryKey({ localDate });

  const { data: seenData } = useQuery(
    trpc.nudges.hasMorningHandoffForDate.queryOptions({ localDate }, { enabled })
  );

  const { data: tasks = [] } = useQuery({
    ...trpc.tasks.listIncomplete.queryOptions(),
    enabled,
  });

  const { data: top3Rows = [] } = useQuery({
    ...trpc.tasks.listTop3Slots.queryOptions({ localDate, tzOffsetMinutes }),
    enabled,
  });

  const { data: projects = [] } = useQuery({
    ...trpc.projects.list.queryOptions(),
    enabled,
  });

  const overCommitInput = useMemo(
    () => ({ date: localDate, tzOffsetMinutes }),
    [localDate, tzOffsetMinutes]
  );

  const { data: overCommit } = useQuery({
    ...trpc.weekOverCommit.isOverCommittedForDate.queryOptions(overCommitInput),
    enabled,
  });

  const { data: protectedBlocks = [] } = useQuery({
    ...trpc.protectedBlocks.listForDate.queryOptions({ date: localDate }),
    enabled,
  });

  const { data: focusBlocks = [] } = useQuery({
    ...trpc.focusBlocks.listForDate.queryOptions({ date: localDate }),
    enabled,
  });

  const { data: calendarConnection } = useQuery({
    ...trpc.calendar.connections.get.queryOptions(),
    enabled,
  });
  const calendarQueryEnabled =
    enabled &&
    calendarConnection?.connected === true &&
    (calendarConnection.selectedCalendarIds?.length ?? 0) > 0;
  const calendarAiEnabled = settings?.calendarAiEnabled ?? true;

  const { data: externalEvents = [] } = useQuery({
    ...trpc.calendar.events.listForDate.queryOptions({ date: localDate, tzOffsetMinutes }),
    enabled: calendarQueryEnabled,
  });

  const { data: calendarDaySummary } = useQuery({
    ...trpc.calendar.events.getDaySummary.queryOptions({ date: localDate, tzOffsetMinutes }),
    enabled: calendarQueryEnabled && calendarAiEnabled,
  });

  const { data: goalSteeringHandoff } = useQuery({
    ...trpc.planning.getGoalSteeringOfferForHandoff.queryOptions({
      localDate,
      tzOffsetMinutes,
    }),
    enabled,
  });

  const [dismissedLocally, setDismissedLocally] = useState(() =>
    isMorningHandoffDismissedForDate(localDate)
  );
  const [holdDeclined, setHoldDeclined] = useState(false);
  const [goalOfferDismissed, setGoalOfferDismissed] = useState(false);
  const [actionPending, setActionPending] = useState(false);

  useEffect(() => {
    setDismissedLocally(isMorningHandoffDismissedForDate(localDate));
    setHoldDeclined(false);
    setGoalOfferDismissed(false);
  }, [localDate]);

  const invalidateTasks = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listTriageCandidates.queryKey() });
    void queryClient.invalidateQueries({
      queryKey: trpc.tasks.listTop3Slots.queryKey({ localDate, tzOffsetMinutes }),
    });
    void queryClient.invalidateQueries({
      queryKey: trpc.protectedBlocks.listForDate.queryKey({ date: localDate }),
    });
  }, [localDate, queryClient, trpc, tzOffsetMinutes]);

  const markSeen = useMutation({
    ...trpc.nudges.markMorningHandoffForDate.mutationOptions(),
    onSuccess: () => {
      queryClient.setQueryData(seenQueryKey, { seen: true });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: seenQueryKey });
    },
  });

  const moveMutation = useMutation(
    trpc.tasks.moveToBucket.mutationOptions({ onSuccess: invalidateTasks })
  );
  const dropMutation = useMutation(
    trpc.abyss.dropFromTask.mutationOptions({ onSuccess: invalidateTasks })
  );
  const skipRecurringMutation = useMutation(
    trpc.recurrence.skipOccurrence.mutationOptions({ onSuccess: invalidateTasks })
  );
  const pinMutation = useMutation(
    trpc.tasks.pinTop3.mutationOptions({ onSuccess: invalidateTasks })
  );
  const unpinMutation = useMutation(
    trpc.tasks.unpinTop3.mutationOptions({ onSuccess: invalidateTasks })
  );
  const confirmHoldMutation = useMutation(
    trpc.protectedBlocks.confirmTop3Hold.mutationOptions({ onSuccess: invalidateTasks })
  );
  const pullGoalStepMutation = useMutation(
    trpc.planning.pullGoalStepToToday.mutationOptions({ onSuccess: invalidateTasks })
  );
  const dismissGoalOfferMutation = useMutation(
    trpc.planning.dismissGoalSteeringOffer.mutationOptions()
  );

  const shouldShow = useMemo(
    () =>
      shouldShowMorningHandoff({
        enabled,
        dismissedLocally,
        seen: seenData?.seen,
        blockedByOtherRitual: mondayBlocked,
      }),
    [enabled, dismissedLocally, seenData?.seen, mondayBlocked]
  );

  const finish = useCallback(() => {
    markMorningHandoffDismissedForDate(localDate);
    setDismissedLocally(true);
    queryClient.setQueryData(seenQueryKey, { seen: true });
    markSeen.mutate({ localDate });
  }, [localDate, markSeen, queryClient, seenQueryKey]);

  const pinnedBySlot = useMemo(() => {
    const map = new Map<number, HandoffPlanTask & { top3Order: number }>();
    for (const row of top3Rows) {
      if (row.top3Order == null) continue;
      map.set(row.top3Order, row as HandoffPlanTask & { top3Order: number });
    }
    return map;
  }, [top3Rows]);

  const busyIntervals = useMemo(
    () =>
      mergeDayBusySources({
        focusBlocks,
        protectedBlocks,
        externalEvents,
      }),
    [focusBlocks, protectedBlocks, externalEvents]
  );

  const calendarSummaryLine = useMemo(() => {
    if (!calendarDaySummary) return null;
    return formatCalendarMeetingSummary(
      calendarDaySummary.timedEventCount,
      calendarDaySummary.busyMinutes
    );
  }, [calendarDaySummary]);

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const hasTop3Hold = protectedBlocks.some((b) => b.source === TOP3_HOLD_SOURCE);
  const incompletePinned = top3Rows.filter((t) => t.completedAt == null);

  const holdCategory = useMemo((): ProjectCategory => {
    const first = incompletePinned.find((t) => t.category && !t.categoryUnresolved);
    return first?.category ?? "professional";
  }, [incompletePinned]);

  const holdPreview = useMemo(() => {
    if (incompletePinned.length === 0 || hasTop3Hold || holdDeclined || overCommit?.overCommitted) {
      return null;
    }
    const slot = computeTop3HoldSlot(
      busyIntervals,
      Math.max(nowMinutes, dayStartHour * 60),
      dayEndHour * 60
    );
    if (!slot) return null;
    return { ...slot, category: holdCategory };
  }, [
    busyIntervals,
    dayEndHour,
    dayStartHour,
    hasTop3Hold,
    holdCategory,
    holdDeclined,
    incompletePinned.length,
    nowMinutes,
    overCommit?.overCommitted,
  ]);

  const handleBegin = useCallback(() => {
    setActionPending(true);
    if (holdPreview && !holdDeclined && !hasTop3Hold) {
      confirmHoldMutation.mutate({
        scheduledDate: localDate,
        category: holdPreview.category,
        startMin: holdPreview.startMin,
        endMin: holdPreview.endMin,
      });
    }
    finish();
    setActionPending(false);
  }, [confirmHoldMutation, finish, hasTop3Hold, holdDeclined, holdPreview, localDate]);

  if (!shouldShow) return null;

  const goalOffer =
    goalOfferDismissed || goalSteeringHandoff?.offer == null ? null : goalSteeringHandoff.offer;

  return (
    <MorningHandoffModal
      localDate={localDate}
      opener={opener}
      calendarSummaryLine={calendarSummaryLine}
      tasks={tasks as HandoffPlanTask[]}
      projects={projects.map((p) => ({ id: p.id, slug: p.slug, name: p.name }))}
      pinnedBySlot={pinnedBySlot}
      holdPreview={holdPreview}
      holdDeclined={holdDeclined}
      isOverCommitted={overCommit?.overCommitted ?? false}
      goalOffer={goalOffer}
      isPending={
        actionPending ||
        markSeen.isPending ||
        pullGoalStepMutation.isPending ||
        dismissGoalOfferMutation.isPending
      }
      onKeepCarryover={(id) => moveMutation.mutate({ id, bucket: "today" })}
      onDropCarryover={(id) => dropMutation.mutate({ id })}
      onConfirmRecurring={() => {
        /* occurrence already renders on today when due */
        invalidateTasks();
      }}
      onSkipRecurring={(recurrenceId, occurrenceDate) =>
        skipRecurringMutation.mutate({ recurrenceId, occurrenceDate })
      }
      onConfirmProjectTask={(id) => moveMutation.mutate({ id, bucket: "today" })}
      onPullProjectTask={(id) => moveMutation.mutate({ id, bucket: "today" })}
      onAcceptGoalOffer={() => {
        if (!goalOffer) return;
        pullGoalStepMutation.mutate(
          { goalId: goalOffer.goalId, localDate },
          { onSuccess: () => setGoalOfferDismissed(true) }
        );
      }}
      onDismissGoalOffer={() => {
        if (!goalOffer) return;
        dismissGoalOfferMutation.mutate(
          { goalId: goalOffer.goalId, localDate },
          { onSuccess: () => setGoalOfferDismissed(true) }
        );
      }}
      onPinTop3={(id, slot) => pinMutation.mutate({ id, slot })}
      onUnpinTop3={(id) => unpinMutation.mutate({ id })}
      onConfirmHold={() => {
        if (!holdPreview) return;
        confirmHoldMutation.mutate({
          scheduledDate: localDate,
          category: holdPreview.category,
          startMin: holdPreview.startMin,
          endMin: holdPreview.endMin,
        });
      }}
      onDeclineHold={() => setHoldDeclined(true)}
      onSkip={finish}
      onBegin={handleBegin}
    />
  );
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useLocalCalendarDate } from "@/hooks/useLocalCalendarDate";
import {
  isOnboardingCompleted,
  isOnboardingStarted,
  markOnboardingCompleted,
  markOnboardingStarted,
} from "@/lib/onboarding/onboarding-storage";
import { shouldShowOnboarding } from "@/lib/onboarding/should-show-onboarding";
import type { HandoffPlanTask } from "@/lib/morning-handoff/handoff-task-filters";
import { mergeDayBusySources } from "@/lib/calendar/merge-day-busy-sources";
import { markMorningHandoffDismissedForDate } from "@/lib/nudges/morning-handoff-storage";
import type { ProjectCategory } from "@/lib/projects/categories";
import { computeTop3HoldSlot } from "@/lib/top3/compute-top3-hold-slot";
import { TOP3_HOLD_SOURCE } from "@/lib/top3/constants";
import { DEFAULT_DAY_END_HOUR, DEFAULT_DAY_START_HOUR } from "@/lib/settings/constants";
import { useTRPC } from "@/trpc/client";

import { usePlanMode } from "./PlanProvider";
import { OnboardingModal, type OnboardingStep } from "./OnboardingModal";

function clientTzOffsetMinutes(): number {
  return -new Date().getTimezoneOffset();
}

const STEP_ORDER: OnboardingStep[] = ["capture", "pin", "hold", "categories", "handoff"];

function nextStep(step: OnboardingStep): OnboardingStep | null {
  const i = STEP_ORDER.indexOf(step);
  if (i < 0 || i >= STEP_ORDER.length - 1) return null;
  return STEP_ORDER[i + 1]!;
}

/**
 * V8 first-run flow: capture → pin #1 → optional hold → categories → morning
 * hand-off preview. Takes priority over the daily morning hand-off.
 */
export function OnboardingRunner() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const localDate = useLocalCalendarDate();
  const tzOffsetMinutes = clientTzOffsetMinutes();
  const { mondayBlocked } = usePlanMode();

  const [completed, setCompleted] = useState(() => isOnboardingCompleted());
  /** null until the empty-day seed check resolves; existing users are marked complete. */
  const [eligible, setEligible] = useState<boolean | null>(() =>
    isOnboardingCompleted() ? false : null
  );
  const [step, setStep] = useState<OnboardingStep>("capture");
  const [holdDeclined, setHoldDeclined] = useState(false);
  const [actionPending, setActionPending] = useState(false);

  const probeEnabled = !completed && eligible === null;
  const shouldShow = shouldShowOnboarding({
    completed,
    eligible,
    blockedByOtherRitual: mondayBlocked,
  });

  const { data: settings } = useQuery({
    ...trpc.settings.get.queryOptions(),
    enabled: shouldShow || probeEnabled,
  });
  const dayStartHour = settings?.dayStartHour ?? DEFAULT_DAY_START_HOUR;
  const dayEndHour = settings?.dayEndHour ?? DEFAULT_DAY_END_HOUR;

  const { data: tasks = [], isFetched: tasksFetched } = useQuery({
    ...trpc.tasks.listIncomplete.queryOptions(),
    enabled: shouldShow || probeEnabled,
  });

  const { data: top3Rows = [], isFetched: top3Fetched } = useQuery({
    ...trpc.tasks.listTop3Slots.queryOptions({ localDate, tzOffsetMinutes }),
    enabled: shouldShow || probeEnabled,
  });

  const { data: categoryRows = [] } = useQuery({
    ...trpc.categorySettings.get.queryOptions(),
    enabled: shouldShow,
  });

  const { data: protectedBlocks = [] } = useQuery({
    ...trpc.protectedBlocks.listForDate.queryOptions({ date: localDate }),
    enabled: shouldShow,
  });

  const { data: focusBlocks = [] } = useQuery({
    ...trpc.focusBlocks.listForDate.queryOptions({ date: localDate }),
    enabled: shouldShow,
  });

  const { data: calendarConnection } = useQuery({
    ...trpc.calendar.connections.get.queryOptions(),
    enabled: shouldShow,
  });
  const calendarQueryEnabled =
    shouldShow &&
    calendarConnection?.connected === true &&
    (calendarConnection.selectedCalendarIds?.length ?? 0) > 0;

  const { data: externalEvents = [] } = useQuery({
    ...trpc.calendar.events.listForDate.queryOptions({ date: localDate, tzOffsetMinutes }),
    enabled: calendarQueryEnabled,
  });

  useEffect(() => {
    if (completed || eligible !== null) return;
    if (!tasksFetched || !top3Fetched) return;
    // Resume mid-flow after refresh; otherwise existing users with work skip.
    if (isOnboardingStarted()) {
      markOnboardingStarted();
      setEligible(true);
      return;
    }
    if (tasks.length > 0 || top3Rows.length > 0) {
      markOnboardingCompleted();
      setCompleted(true);
      setEligible(false);
      return;
    }
    markOnboardingStarted();
    setEligible(true);
  }, [completed, eligible, tasks.length, tasksFetched, top3Fetched, top3Rows.length]);

  const invalidateTasks = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
    void queryClient.invalidateQueries({
      queryKey: trpc.tasks.listTop3Slots.queryKey({ localDate, tzOffsetMinutes }),
    });
    void queryClient.invalidateQueries({
      queryKey: trpc.protectedBlocks.listForDate.queryKey({ date: localDate }),
    });
  }, [localDate, queryClient, trpc, tzOffsetMinutes]);

  const pinMutation = useMutation(
    trpc.tasks.pinTop3.mutationOptions({ onSuccess: invalidateTasks })
  );
  const confirmHoldMutation = useMutation(
    trpc.protectedBlocks.confirmTop3Hold.mutationOptions({ onSuccess: invalidateTasks })
  );
  const updateCategoryMutation = useMutation(
    trpc.categorySettings.update.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.categorySettings.get.queryKey() });
      },
    })
  );
  const markHandoffSeen = useMutation(trpc.nudges.markMorningHandoffForDate.mutationOptions());

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

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const hasTop3Hold = protectedBlocks.some((b) => b.source === TOP3_HOLD_SOURCE);
  const incompletePinned = top3Rows.filter((t) => t.completedAt == null);

  const holdCategory = useMemo((): ProjectCategory => {
    const first = incompletePinned.find((t) => t.category && !t.categoryUnresolved);
    return first?.category ?? "professional";
  }, [incompletePinned]);

  const holdPreview = useMemo(() => {
    if (incompletePinned.length === 0 || hasTop3Hold || holdDeclined) return null;
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
  ]);

  const finish = useCallback(() => {
    markOnboardingCompleted();
    markMorningHandoffDismissedForDate(localDate);
    setCompleted(true);
    markHandoffSeen.mutate({ localDate });
  }, [localDate, markHandoffSeen]);

  const advance = useCallback(() => {
    const next = nextStep(step);
    if (next) setStep(next);
    else finish();
  }, [finish, step]);

  if (!shouldShow) return null;

  return (
    <OnboardingModal
      localDate={localDate}
      step={step}
      tasks={tasks as HandoffPlanTask[]}
      pinnedBySlot={pinnedBySlot}
      categories={categoryRows.map((c) => ({ category: c.category, label: c.label }))}
      holdPreview={holdPreview}
      holdDeclined={holdDeclined}
      isPending={
        actionPending ||
        pinMutation.isPending ||
        confirmHoldMutation.isPending ||
        updateCategoryMutation.isPending
      }
      onTaskCreated={invalidateTasks}
      onPin={(taskId) => {
        setActionPending(true);
        pinMutation.mutate({ id: taskId, slot: 1 }, { onSettled: () => setActionPending(false) });
      }}
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
      onSaveCategoryLabel={(category, label) => {
        updateCategoryMutation.mutate({ category, label });
      }}
      onContinue={advance}
      onSkipHold={() => {
        setHoldDeclined(true);
        advance();
      }}
      onFinish={finish}
    />
  );
}

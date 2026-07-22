"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useLocalCalendarDate } from "@/hooks/useLocalCalendarDate";
import { useRitualOverlay } from "@/hooks/useRitualOverlay";
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
import { useOptionalToast } from "@/components/kash/ui/ToastProvider";
import { MOTION_TOKEN, readMotionDurationMs } from "@/lib/animate/motion-tokens";
import {
  resolveOccurrenceKeys,
  type HandoffPlanTask,
} from "@/lib/morning-handoff/handoff-task-filters";
import type { CreateTaskItemEdit } from "@/lib/chat/proposed-actions";
import {
  collectStagedDependencyEdges,
  stagedCapturesFromEdits,
  type StagedCapture,
} from "@/lib/morning-handoff/staged-capture";
import { useTRPC } from "@/trpc/client";

import { MorningHandoffModal } from "./MorningHandoffModal";
import { usePlanMode } from "./PlanProvider";

function clientTzOffsetMinutes(): number {
  return -new Date().getTimezoneOffset();
}

/** Drop every Top 3 slot that currently points at `stagedId`. */
function withoutStagedPin(pins: Map<number, string>, stagedId: string): Map<number, string> {
  const next = new Map(pins);
  for (const [slot, id] of Array.from(next)) {
    if (id === stagedId) next.delete(slot);
  }
  return next;
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
  const [stagedCaptures, setStagedCaptures] = useState<StagedCapture[]>([]);
  const [stagedPinnedBySlot, setStagedPinnedBySlot] = useState<Map<number, string>>(
    () => new Map()
  );

  const clearStaged = useCallback(() => {
    setStagedCaptures([]);
    setStagedPinnedBySlot(new Map());
  }, []);

  useEffect(() => {
    setDismissedLocally(isMorningHandoffDismissedForDate(localDate));
    setHoldDeclined(false);
    setGoalOfferDismissed(false);
    clearStaged();
  }, [localDate, clearStaged]);

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

  const toastCtx = useOptionalToast();

  // Let the triage row's slide-out finish before the refetch unmounts it
  // (mirrors TaskRow's invalidatePlanAfterSlide pacing).
  const completeInvalidateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const invalidateAfterCompleteSlide = useCallback(() => {
    if (completeInvalidateTimerRef.current) clearTimeout(completeInvalidateTimerRef.current);
    completeInvalidateTimerRef.current = setTimeout(() => {
      invalidateTasks();
      void queryClient.invalidateQueries({
        queryKey: trpc.tasks.listRecentlyCompleted.queryKey(),
      });
    }, readMotionDurationMs(MOTION_TOKEN.medium));
  }, [invalidateTasks, queryClient, trpc]);

  useEffect(
    () => () => {
      if (completeInvalidateTimerRef.current) clearTimeout(completeInvalidateTimerRef.current);
    },
    []
  );

  const uncompleteMutation = useMutation(
    trpc.tasks.uncomplete.mutationOptions({ onSuccess: invalidateTasks })
  );
  const completeMutation = useMutation(
    trpc.tasks.complete.mutationOptions({
      onSuccess: (data) => {
        invalidateAfterCompleteSlide();
        toastCtx?.toast({
          message: "Completed",
          action: {
            label: "Undo",
            onClick: () => uncompleteMutation.mutate({ id: data.task.id }),
          },
        });
      },
    })
  );
  const completeOccurrenceMutation = useMutation(
    trpc.recurrence.completeOccurrence.mutationOptions({
      onSuccess: () => {
        invalidateAfterCompleteSlide();
        toastCtx?.toast({ message: "Completed" });
      },
    })
  );
  const skipOccurrenceMutation = useMutation(
    trpc.recurrence.skipOccurrence.mutationOptions({ onSuccess: invalidateTasks })
  );
  const rescheduleOccurrenceMutation = useMutation(
    trpc.recurrence.rescheduleOccurrence.mutationOptions({ onSuccess: invalidateTasks })
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
  const createTaskMutation = useMutation(
    trpc.tasks.create.mutationOptions({ onSuccess: invalidateTasks })
  );
  const createDependencyMutation = useMutation(trpc.dependencies.create.mutationOptions());

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

  useRitualOverlay(shouldShow);

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

  /** Occurrence keys for recurring virtual rows (`rec:<uuid>:<date>` ids) — null for plain tasks. */
  const occurrenceKeysFor = useCallback(
    (taskId: string) => {
      const task = (tasks as HandoffPlanTask[]).find((t) => t.id === taskId);
      if (!task?.isRecurringOccurrence) return null;
      return resolveOccurrenceKeys(task);
    },
    [tasks]
  );

  const handleCompleteTask = useCallback(
    (taskId: string) => {
      const keys = occurrenceKeysFor(taskId);
      if (keys) completeOccurrenceMutation.mutate(keys);
      else completeMutation.mutate({ id: taskId });
    },
    [occurrenceKeysFor, completeOccurrenceMutation, completeMutation]
  );

  const onStageTasks = useCallback((edits: CreateTaskItemEdit[]) => {
    setStagedCaptures((prev) => [...prev, ...stagedCapturesFromEdits(edits)]);
  }, []);

  const onRemoveStaged = useCallback((stagedId: string) => {
    setStagedCaptures((prev) => prev.filter((capture) => capture.id !== stagedId));
    setStagedPinnedBySlot((prev) => withoutStagedPin(prev, stagedId));
  }, []);

  const onPinStagedTop3 = useCallback((stagedId: string, slot: 1 | 2 | 3) => {
    setStagedPinnedBySlot((prev) => {
      const next = withoutStagedPin(prev, stagedId);
      next.set(slot, stagedId);
      return next;
    });
  }, []);

  const onUnpinStagedTop3 = useCallback((stagedId: string) => {
    setStagedPinnedBySlot((prev) => withoutStagedPin(prev, stagedId));
  }, []);

  const handleSkip = useCallback(() => {
    clearStaged();
    finish();
  }, [clearStaged, finish]);

  const handleBegin = useCallback(async () => {
    setActionPending(true);
    try {
      // Commit staged captures first so Dep-B edges and Top 3 pins can remap
      // from proposal/staged ids onto real task ids.
      const idByStagedId = new Map<string, string>();
      const idBySourceItemId = new Map<string, string>();

      for (const capture of stagedCaptures) {
        const projectId = capture.projectSlug
          ? (projects.find((p) => p.slug === capture.projectSlug)?.id ?? null)
          : null;
        const created = await createTaskMutation.mutateAsync({
          title: capture.title,
          scheduledDate: localDate,
          projectId,
          phaseId: capture.phaseId,
          priority: capture.priority,
          category: capture.category ?? undefined,
        });
        idByStagedId.set(capture.id, created.id);
        idBySourceItemId.set(capture.sourceItemId, created.id);
      }

      for (const edge of collectStagedDependencyEdges(stagedCaptures)) {
        const blockerTaskId = idBySourceItemId.get(edge.blockerItemId);
        const blockedTaskId = idBySourceItemId.get(edge.blockedItemId);
        if (!blockerTaskId || !blockedTaskId) continue;
        await createDependencyMutation.mutateAsync({
          blockerTaskId,
          blockedTaskId,
          tzOffsetMinutes,
        });
      }

      for (const [slot, stagedId] of Array.from(stagedPinnedBySlot)) {
        const taskId = idByStagedId.get(stagedId);
        if (!taskId) continue;
        await pinMutation.mutateAsync({ id: taskId, slot: slot as 1 | 2 | 3 });
      }

      if (holdPreview && !holdDeclined && !hasTop3Hold) {
        await confirmHoldMutation.mutateAsync({
          scheduledDate: localDate,
          category: holdPreview.category,
          startMin: holdPreview.startMin,
          endMin: holdPreview.endMin,
        });
      }

      clearStaged();
      finish();
    } finally {
      setActionPending(false);
    }
  }, [
    clearStaged,
    confirmHoldMutation,
    createDependencyMutation,
    createTaskMutation,
    finish,
    hasTop3Hold,
    holdDeclined,
    holdPreview,
    localDate,
    pinMutation,
    projects,
    stagedCaptures,
    stagedPinnedBySlot,
    tzOffsetMinutes,
  ]);

  if (!shouldShow) return null;

  const goalOffer =
    goalOfferDismissed || goalSteeringHandoff?.offer == null ? null : goalSteeringHandoff.offer;

  return (
    <MorningHandoffModal
      localDate={localDate}
      opener={opener}
      calendarSummaryLine={calendarSummaryLine}
      calendarMeetings={externalEvents}
      tasks={tasks as HandoffPlanTask[]}
      projects={projects.map((p) => ({ id: p.id, slug: p.slug, name: p.name }))}
      pinnedBySlot={pinnedBySlot}
      stagedPinnedBySlot={stagedPinnedBySlot}
      stagedCaptures={stagedCaptures}
      holdPreview={holdPreview}
      holdDeclined={holdDeclined}
      isOverCommitted={overCommit?.overCommitted ?? false}
      goalOffer={goalOffer}
      isPending={
        actionPending ||
        markSeen.isPending ||
        pullGoalStepMutation.isPending ||
        dismissGoalOfferMutation.isPending ||
        createTaskMutation.isPending ||
        createDependencyMutation.isPending
      }
      onKeepCarryover={(id) => {
        // Recurring occurrences have `rec:` ids that uuid-validated mutations
        // reject — route them through occurrence overrides instead.
        const keys = occurrenceKeysFor(id);
        if (keys) rescheduleOccurrenceMutation.mutate({ ...keys, movedToDate: localDate });
        else moveMutation.mutate({ id, bucket: "today" });
      }}
      onDropCarryover={(id) => {
        const keys = occurrenceKeysFor(id);
        if (keys) skipOccurrenceMutation.mutate(keys);
        else dropMutation.mutate({ id });
      }}
      onCompleteTask={handleCompleteTask}
      onConfirmProjectTask={(id) => moveMutation.mutate({ id, bucket: "today" })}
      onDeferProjectTask={(id) => {
        const pinned = Array.from(pinnedBySlot.values()).some((task) => task.id === id);
        if (pinned) unpinMutation.mutate({ id });
        moveMutation.mutate({ id, bucket: "later" });
      }}
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
      onPinStagedTop3={onPinStagedTop3}
      onUnpinStagedTop3={onUnpinStagedTop3}
      onRemoveStaged={onRemoveStaged}
      onRemoveFromToday={(id) => {
        const pinned = Array.from(pinnedBySlot.values()).some((task) => task.id === id);
        if (pinned) unpinMutation.mutate({ id });
        moveMutation.mutate({ id, bucket: "later" });
      }}
      onStageTasks={onStageTasks}
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
      onSkip={handleSkip}
      onBegin={handleBegin}
    />
  );
}

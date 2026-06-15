"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useRouter } from "next/navigation";

import { COMPOSER_DRAFT_KEYS } from "@/lib/composer/composer-draft-constants";
import { animatePinToTop3 } from "@/lib/animate/pin-to-top3";
import { useLocalCalendarDate } from "@/hooks/useLocalCalendarDate";
import { useSessionUndo } from "@/hooks/useSessionUndo";
import { isEditableTarget } from "@/lib/keyboard/is-editable-target";
import { toISODateString } from "@/lib/dates/local-day";
import type { Bucket } from "@/lib/tasks/derive-bucket";
import { partitionNamedDays } from "@/lib/tasks/partition-named-days";
import { partitionPlanTasks } from "@/lib/tasks/partition-plan-tasks";
import { resolvePulseTarget, type TaskCreatedPulse } from "@/lib/tasks/resolve-pulse-target";
import { pickRdmTask } from "@/lib/rdm/pick-task";
import type { BucketMode } from "@/lib/settings/constants";
import { useTRPC } from "@/trpc/client";

import { DECIDE_EVENT } from "../CommandPalette";
import { usePlanMode } from "./PlanProvider";
import { QuickInput, type QuickInputHandle } from "./QuickInput";
import type { PlanTaskRow } from "./TaskRow";
import { PlanBuckets } from "./PlanBuckets";
import { PlanBucketsNamedDays } from "./PlanBucketsNamedDays";
import { TimelinePane } from "./TimelinePane";
import { TodayList } from "./TodayList";
import { Top3ReplacePicker } from "./Top3ReplacePicker";
import { Top3Slots, type Top3SlotTask } from "./Top3Slots";

const RELATIVE_BUCKETS = new Set<string>(["today", "tomorrow", "this_week", "later"]);

function firstFreeSlot(pinnedBySlot: Map<number, Top3SlotTask>): 1 | 2 | 3 | null {
  for (const slot of [1, 2, 3] as const) {
    if (!pinnedBySlot.has(slot)) return slot;
  }
  return null;
}

function clientTzOffsetMinutes(): number {
  return -new Date().getTimezoneOffset();
}

export function DayPlanCanvas() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { touchActivity } = usePlanMode();
  const quickInputRef = useRef<QuickInputHandle>(null);
  const top3SectionRef = useRef<HTMLElement>(null);
  const router = useRouter();
  const [pulseTarget, setPulseTarget] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [replacePickerTaskId, setReplacePickerTaskId] = useState<string | null>(null);
  const [top3Highlighted, setTop3Highlighted] = useState(false);
  const top3HighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWasLargeRef = useRef(false);
  const { pushComplete, pushDelete } = useSessionUndo();

  const { data: settings } = useQuery(trpc.settings.get.queryOptions());
  const bucketMode: BucketMode = settings?.bucketMode ?? "relative";

  /** Stable calendar anchor for partitioning and pulse targets (same mount session). */
  const now = useMemo(() => new Date(), []);
  const localDate = useLocalCalendarDate();
  const tzOffsetMinutes = clientTzOffsetMinutes();
  const top3QueryInput = useMemo(
    () => ({ localDate, tzOffsetMinutes }),
    [localDate, tzOffsetMinutes]
  );

  const invalidatePlan = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listTriageCandidates.queryKey() });
    void queryClient.invalidateQueries({
      queryKey: trpc.tasks.listTop3Slots.queryKey(top3QueryInput),
    });
  }, [
    queryClient,
    top3QueryInput,
    trpc.tasks.listIncomplete,
    trpc.tasks.listTriageCandidates,
    trpc.tasks.listTop3Slots,
  ]);

  const triggerPulse = useCallback(
    (target: string) => {
      touchActivity();
      setPulseTarget(target);
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
      pulseTimerRef.current = setTimeout(() => setPulseTarget(null), 1500);
    },
    [touchActivity]
  );

  const handleTaskCreated = useCallback(
    (pulse: TaskCreatedPulse) => {
      triggerPulse(resolvePulseTarget(pulse, bucketMode, now));
    },
    [bucketMode, now, triggerPulse]
  );

  useEffect(() => {
    quickInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;

      e.preventDefault();
      quickInputRef.current?.focus();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    return () => {
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
      if (top3HighlightTimerRef.current) clearTimeout(top3HighlightTimerRef.current);
    };
  }, []);

  const highlightTop3 = useCallback(() => {
    top3SectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setTop3Highlighted(true);
    if (top3HighlightTimerRef.current) clearTimeout(top3HighlightTimerRef.current);
    top3HighlightTimerRef.current = setTimeout(() => setTop3Highlighted(false), 1500);
  }, []);

  const { data: tasks = [], isLoading } = useQuery(trpc.tasks.listIncomplete.queryOptions());
  const { data: triageTasks = [] } = useQuery(trpc.tasks.listTriageCandidates.queryOptions());
  const { data: top3Slots = [] } = useQuery(trpc.tasks.listTop3Slots.queryOptions(top3QueryInput));

  const triageIds = useMemo(() => new Set(triageTasks.map((t) => t.id)), [triageTasks]);

  const tasksExcludingTriage = useMemo(
    () => tasks.filter((t) => !triageIds.has(t.id)),
    [tasks, triageIds]
  );

  const partitionedRelative = useMemo(
    () => partitionPlanTasks(tasksExcludingTriage, now),
    [tasksExcludingTriage, now]
  );

  const partitionedNamed = useMemo(
    () => partitionNamedDays(tasksExcludingTriage, now),
    [tasksExcludingTriage, now]
  );

  const todayTasks =
    bucketMode === "named_days" ? partitionedNamed.today : partitionedRelative.today;

  const triggerRdmPick = useCallback(() => {
    const pick = pickRdmTask(todayTasks, { lastWasLarge: lastWasLargeRef.current });
    if (!pick) return;

    lastWasLargeRef.current = pick.isTop3;

    const params = new URLSearchParams({ taskId: pick.id });
    router.push(`/today/focus?${params.toString()}`);
  }, [todayTasks, router]);

  const toRow = (task: (typeof tasks)[number]): PlanTaskRow => ({
    id: task.id,
    title: task.title,
    priority: task.priority,
    projectId: task.projectId,
    projectSlug: task.projectSlug,
    projectName: task.projectName,
    isTop3: task.isTop3,
  });

  const pinnedBySlot = useMemo(() => {
    const map = new Map<number, Top3SlotTask>();
    for (const task of top3Slots) {
      if (task.top3Order == null) continue;
      map.set(task.top3Order, {
        id: task.id,
        title: task.title,
        projectId: task.projectId,
        projectSlug: task.projectSlug,
        top3Order: task.top3Order,
        completedAt: task.completedAt,
      });
    }
    return map;
  }, [top3Slots]);

  const moveMutation = useMutation(
    trpc.tasks.moveToBucket.mutationOptions({
      onSuccess: () => {
        touchActivity();
        invalidatePlan();
      },
    })
  );

  const scheduleMutation = useMutation(
    trpc.tasks.scheduleToDate.mutationOptions({
      onSuccess: () => {
        touchActivity();
        invalidatePlan();
      },
    })
  );

  const pinMutation = useMutation(
    trpc.tasks.pinTop3.mutationOptions({
      onSuccess: () => {
        touchActivity();
        invalidatePlan();
      },
    })
  );

  const unpinMutation = useMutation(
    trpc.tasks.unpinTop3.mutationOptions({
      onSuccess: () => {
        touchActivity();
        invalidatePlan();
      },
    })
  );

  const executePin = useCallback(
    (taskId: string, slot: 1 | 2 | 3, sourceEl: HTMLElement | null, title: string) => {
      const runMutation = () => pinMutation.mutate({ id: taskId, slot });

      const sectionEl = top3SectionRef.current;
      if (sourceEl && sectionEl) {
        animatePinToTop3({
          sourceEl,
          top3SectionEl: sectionEl,
          title,
          onComplete: runMutation,
        });
      } else {
        runMutation();
      }
    },
    [pinMutation]
  );

  const handlePinFromToday = useCallback(
    (taskId: string, sourceEl: HTMLElement) => {
      const task = todayTasks.find((t) => t.id === taskId);
      const title = task?.title ?? "";
      const slot = firstFreeSlot(pinnedBySlot);

      if (slot != null) {
        executePin(taskId, slot, sourceEl, title);
        return;
      }

      highlightTop3();
      setReplacePickerTaskId(taskId);
    },
    [todayTasks, pinnedBySlot, executePin, highlightTop3]
  );

  const handleReplaceSlot = useCallback(
    (slot: 1 | 2 | 3) => {
      if (!replacePickerTaskId) return;
      const task = todayTasks.find((t) => t.id === replacePickerTaskId);
      const title = task?.title ?? "";
      const sourceEl = document.querySelector<HTMLElement>(
        `[data-task-row="${replacePickerTaskId}"]`
      );
      setReplacePickerTaskId(null);
      executePin(replacePickerTaskId, slot, sourceEl, title);
    },
    [replacePickerTaskId, todayTasks, executePin]
  );

  const todayIso = toISODateString(now);

  const invalidateBlocks = useCallback(() => {
    touchActivity();
    void queryClient.invalidateQueries({
      queryKey: trpc.focusBlocks.listForDate.queryKey({ date: todayIso }),
    });
  }, [queryClient, todayIso, touchActivity, trpc.focusBlocks.listForDate]);

  const createBlockMutation = useMutation(
    trpc.focusBlocks.create.mutationOptions({ onSuccess: invalidateBlocks })
  );

  const moveBlockMutation = useMutation(
    trpc.focusBlocks.move.mutationOptions({ onSuccess: invalidateBlocks })
  );

  const handleActivateTask = useCallback(
    (taskId: string) => {
      router.push(`/today/focus?${new URLSearchParams({ taskId }).toString()}`);
    },
    [router]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      if (isEditableTarget(e.target)) return;

      const slot = e.key === "1" ? 1 : e.key === "2" ? 2 : e.key === "3" ? 3 : null;
      if (!slot || !selectedTaskId) return;

      e.preventDefault();
      pinMutation.mutate({ id: selectedTaskId, slot });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pinMutation, selectedTaskId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      if (e.key.toLowerCase() !== "d") return;
      if (isEditableTarget(e.target)) return;

      e.preventDefault();
      triggerRdmPick();
    };

    // The command palette dispatches this when the user runs "Decide next task".
    const onDecide = () => triggerRdmPick();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(DECIDE_EVENT, onDecide);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(DECIDE_EVENT, onDecide);
    };
  }, [triggerRdmPick]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragEnd = (event: DragEndEvent) => {
    const overId = event.over?.id;
    if (!overId || typeof overId !== "string") return;

    const activeId = String(event.active.id);

    // Moving an existing focus block onto a timeline slot.
    if (activeId.startsWith("block:")) {
      if (!overId.startsWith("timeline:")) return;
      const startMin = Number(overId.slice("timeline:".length));
      if (Number.isNaN(startMin)) return;
      moveBlockMutation.mutate({ id: activeId.slice("block:".length), startMin });
      return;
    }

    if (!activeId.startsWith("task:")) return;

    const taskId = activeId.slice("task:".length);

    if (overId.startsWith("top3:")) {
      const suffix = overId.slice("top3:".length);
      if (suffix === "next") {
        const slot = firstFreeSlot(pinnedBySlot);
        if (slot == null) return;
        pinMutation.mutate({ id: taskId, slot });
        return;
      }
      const slot = Number(suffix);
      if (slot !== 1 && slot !== 2 && slot !== 3) return;
      pinMutation.mutate({ id: taskId, slot });
      return;
    }

    if (overId.startsWith("timeline:")) {
      const startMin = Number(overId.slice("timeline:".length));
      if (Number.isNaN(startMin)) return;
      createBlockMutation.mutate({ taskId, date: todayIso, startMin });
      return;
    }

    if (!overId.startsWith("bucket:")) return;

    if (overId.startsWith("bucket:date:")) {
      const iso = overId.slice("bucket:date:".length);
      scheduleMutation.mutate({ id: taskId, scheduledDate: iso });
      triggerPulse(iso);
      return;
    }

    const bucketKey = overId.slice("bucket:".length);
    if (!RELATIVE_BUCKETS.has(bucketKey)) return;

    const bucket = bucketKey as Bucket;
    moveMutation.mutate({ id: taskId, bucket });
    triggerPulse(bucket);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1 lg:basis-0">
          <QuickInput
            ref={quickInputRef}
            draftStorageKey={COMPOSER_DRAFT_KEYS.planDay}
            onTaskCreated={handleTaskCreated}
          />
          <Top3Slots
            ref={top3SectionRef}
            pinnedBySlot={pinnedBySlot}
            highlighted={top3Highlighted}
            onUnpin={(taskId) => unpinMutation.mutate({ id: taskId })}
          />
          {replacePickerTaskId ? (
            <Top3ReplacePicker
              pinnedBySlot={pinnedBySlot}
              anchorEl={top3SectionRef.current}
              onReplace={handleReplaceSlot}
              onDismiss={() => setReplacePickerTaskId(null)}
            />
          ) : null}
          <TodayList
            pulse={pulseTarget === "today"}
            tasks={todayTasks.map(toRow)}
            isLoading={isLoading}
            selectedTaskId={selectedTaskId}
            onSelectTask={setSelectedTaskId}
            onActivateTask={handleActivateTask}
            onComplete={pushComplete}
            onDelete={pushDelete}
            onPin={handlePinFromToday}
          />
          {bucketMode === "named_days" ? (
            <PlanBucketsNamedDays
              tasks={{
                tomorrow: partitionedNamed.tomorrow.map(toRow),
                byWeekdayIso: Object.fromEntries(
                  Object.entries(partitionedNamed.byWeekdayIso).map(([iso, list]) => [
                    iso,
                    list.map(toRow),
                  ])
                ),
                later: partitionedNamed.later.map(toRow),
              }}
              pulseTarget={pulseTarget}
              onComplete={pushComplete}
              onDelete={pushDelete}
            />
          ) : (
            <PlanBuckets
              tasks={{
                tomorrow: partitionedRelative.tomorrow.map(toRow),
                thisWeek: partitionedRelative.thisWeek.map(toRow),
                later: partitionedRelative.later.map(toRow),
              }}
              pulseTarget={pulseTarget}
              onComplete={pushComplete}
              onDelete={pushDelete}
            />
          )}
        </div>
        <div className="min-w-0 flex-1 lg:basis-0">
          <TimelinePane />
        </div>
      </div>
    </DndContext>
  );
}

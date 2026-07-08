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
import { MOTION_TOKEN, readMotionDurationMs } from "@/lib/animate/motion-tokens";
import { useLocalCalendarDate } from "@/hooks/useLocalCalendarDate";
import { useTop3Assurance } from "@/hooks/useTop3Assurance";
import { useSessionUndo } from "@/hooks/useSessionUndo";
import { useUserConstraints } from "@/hooks/useUserConstraints";
import { evaluateProposedSlot } from "@/lib/about-me/constraint-eval";
import { isEditableTarget } from "@/lib/keyboard/is-editable-target";
import { toISODateString } from "@/lib/dates/local-day";
import type { Bucket } from "@/lib/tasks/derive-bucket";
import { bucketToSchedulingFields } from "@/lib/tasks/bucket-scheduling";
import { partitionNamedDays } from "@/lib/tasks/partition-named-days";
import { partitionPlanTasks } from "@/lib/tasks/partition-plan-tasks";
import { resolvePulseTarget, type TaskCreatedPulse } from "@/lib/tasks/resolve-pulse-target";
import { pickRdmTask } from "@/lib/rdm/pick-task";
import type { BucketMode } from "@/lib/settings/constants";
import {
  DEFAULT_DAY_END_HOUR,
  DEFAULT_DAY_START_HOUR,
  DEFAULT_TOP3_MIDDAY_CHECKIN,
} from "@/lib/settings/constants";
import { selectCompletionsToday } from "@/lib/today/select-completions-today";
import { useTRPC, type RouterOutputs } from "@/trpc/client";

import { InPageSwitcher, type SwitcherOption } from "../InPageSwitcher";
import { CHAT_SEND_EVENT, DECIDE_EVENT } from "../chrome-events";
import { triggerEphemeralCelebration } from "../mechanics/EphemeralCelebration";
import { useToast } from "../ui/ToastProvider";
import { usePlanMode } from "./PlanProvider";
import { AddTaskPopover, type AddTaskPopoverHandle } from "./AddTaskPopover";
import { QuickInput, type QuickInputHandle } from "./QuickInput";
import { BreathingOverlay } from "../care/BreathingOverlay";
import { WalkTimerOverlay } from "../care/WalkTimerOverlay";
import {
  SELF_CARE_START_BREATHE,
  SELF_CARE_START_WALK,
} from "@/lib/nudges/self-care-session-events";
import type { PlanTaskRow } from "./TaskRow";
import { BalanceBar } from "./BalanceBar";
import { LensControlBar } from "./LensControlBar";
import { TimelinePane } from "./TimelinePane";
import { TodayList } from "./TodayList";
import { TodayReviewPanel } from "./TodayReviewPanel";
import { Top3ReplacePicker } from "./Top3ReplacePicker";
import { Top3Slots, type Top3SlotTask } from "./Top3Slots";
import { useChat } from "../chat/ChatProvider";
import { optimisticPatch, rollbackPatches } from "./optimistic-cache";

type IncompleteTask = RouterOutputs["tasks"]["listIncomplete"][number];
type Top3SlotRow = RouterOutputs["tasks"]["listTop3Slots"][number];

const RELATIVE_BUCKETS = new Set<string>(["today", "tomorrow", "this_week", "later"]);

const DEFAULT_FOCUS_BLOCK_MIN = 45;
const TIMELINE_SNAP_MINUTES = 15;

function snapNowToSlot(): number {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return Math.round(nowMin / TIMELINE_SNAP_MINUTES) * TIMELINE_SNAP_MINUTES;
}

function overlapsNow(startMin: number, durationMin: number): boolean {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin >= startMin && nowMin < startMin + durationMin;
}

function timelineDropStartMin(overId: string): number | null {
  if (overId === "timeline:now") return snapNowToSlot();
  if (!overId.startsWith("timeline:")) return null;
  const startMin = Number(overId.slice("timeline:".length));
  return Number.isNaN(startMin) ? null : startMin;
}

/** Today's main-area views (VF redesign): the list, the full-width schedule, or the day review. */
type TodayView = "list" | "calendar" | "review";

const VIEW_OPTIONS: ReadonlyArray<SwitcherOption<TodayView>> = [
  { value: "list", label: "List" },
  { value: "calendar", label: "Calendar" },
  { value: "review", label: "Review" },
];

const TODAY_VIEW_STORAGE_KEY = "kash:today-view";

function readStoredTodayView(): TodayView | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TODAY_VIEW_STORAGE_KEY);
    return raw === "list" || raw === "calendar" || raw === "review" ? raw : null;
  } catch {
    return null;
  }
}

function writeStoredTodayView(view: TodayView): void {
  try {
    window.localStorage.setItem(TODAY_VIEW_STORAGE_KEY, view);
  } catch {
    /* ignore quota / private mode */
  }
}

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
  const addTaskRef = useRef<AddTaskPopoverHandle>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const top3SectionRef = useRef<HTMLElement>(null);
  const router = useRouter();
  const [pulseTarget, setPulseTarget] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [replacePickerTaskId, setReplacePickerTaskId] = useState<string | null>(null);
  const [top3Highlighted, setTop3Highlighted] = useState(false);
  // Default "list" on the server + first paint (avoids a hydration mismatch),
  // then restore the persisted choice on mount.
  const [view, setView] = useState<TodayView>("list");
  useEffect(() => {
    const stored = readStoredTodayView();
    if (stored) setView(stored);
  }, []);
  const changeView = useCallback((next: TodayView) => {
    setView(next);
    writeStoredTodayView(next);
  }, []);
  const [walkOverlayOpen, setWalkOverlayOpen] = useState(false);
  const [breatheOverlayOpen, setBreatheOverlayOpen] = useState(false);
  const top3CelebratedRef = useRef(false);
  const top3HighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWasLargeRef = useRef(false);
  const { pushComplete, pushUncomplete, pushDelete } = useSessionUndo();
  const { toast } = useToast();
  const notifyMutationError = useCallback(
    () => toast({ message: "That change didn't save. Please try again.", variant: "error" }),
    [toast]
  );
  const { constraints } = useUserConstraints();

  const { data: settings } = useQuery(trpc.settings.get.queryOptions());
  const bucketMode: BucketMode = settings?.bucketMode ?? "relative";
  const dayStartHour = settings?.dayStartHour ?? DEFAULT_DAY_START_HOUR;
  const dayEndHour = settings?.dayEndHour ?? DEFAULT_DAY_END_HOUR;
  const top3MiddayCheckin = settings?.top3MiddayCheckin ?? DEFAULT_TOP3_MIDDAY_CHECKIN;
  const { openRail } = useChat();

  useEffect(() => {
    const onWalk = () => setWalkOverlayOpen(true);
    const onBreathe = () => setBreatheOverlayOpen(true);
    window.addEventListener(SELF_CARE_START_WALK, onWalk);
    window.addEventListener(SELF_CARE_START_BREATHE, onBreathe);
    return () => {
      window.removeEventListener(SELF_CARE_START_WALK, onWalk);
      window.removeEventListener(SELF_CARE_START_BREATHE, onBreathe);
    };
  }, []);

  /** Stable calendar anchor for partitioning and pulse targets (same mount session). */
  const now = useMemo(() => new Date(), []);
  const weekdayLabel = now.toLocaleDateString(undefined, { weekday: "long" });
  const monthDayLabel = now.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const localDate = useLocalCalendarDate();
  const tzOffsetMinutes = clientTzOffsetMinutes();
  const top3QueryInput = useMemo(
    () => ({ localDate, tzOffsetMinutes }),
    [localDate, tzOffsetMinutes]
  );
  const { data: weekPayload } = useQuery(
    trpc.weekReviews.getPayload.queryOptions({ tzOffsetMinutes })
  );

  const invalidatePlan = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listTriageCandidates.queryKey() });
    void queryClient.invalidateQueries({
      queryKey: trpc.tasks.listTop3Slots.queryKey(top3QueryInput),
    });
    void queryClient.invalidateQueries({
      queryKey: trpc.tasks.listRecentlyCompleted.queryKey(),
    });
  }, [
    queryClient,
    top3QueryInput,
    trpc.tasks.listIncomplete,
    trpc.tasks.listTriageCandidates,
    trpc.tasks.listTop3Slots,
    trpc.tasks.listRecentlyCompleted,
  ]);

  const triggerPulse = useCallback(
    (target: string) => {
      touchActivity();
      setPulseTarget(target);
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
      pulseTimerRef.current = setTimeout(
        () => setPulseTarget(null),
        readMotionDurationMs(MOTION_TOKEN.long)
      );
    },
    [touchActivity]
  );

  const handleTaskCreated = useCallback(
    (pulse: TaskCreatedPulse) => {
      triggerPulse(resolvePulseTarget(pulse, bucketMode, now));
    },
    [bucketMode, now, triggerPulse]
  );

  // The composer is pinned at the bottom now, so don't auto-focus on mount —
  // that would scroll the summary band out of view on load. "/" still focuses it.
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
    top3HighlightTimerRef.current = setTimeout(
      () => setTop3Highlighted(false),
      readMotionDurationMs(MOTION_TOKEN.long)
    );
  }, []);

  const { data: tasks = [], isLoading } = useQuery(trpc.tasks.listIncomplete.queryOptions());
  const { data: triageTasks = [] } = useQuery(trpc.tasks.listTriageCandidates.queryOptions());
  const { data: top3Slots = [] } = useQuery(trpc.tasks.listTop3Slots.queryOptions(top3QueryInput));
  const { data: recentlyCompleted = [] } = useQuery(
    trpc.tasks.listRecentlyCompleted.queryOptions()
  );

  // AN-T1b: the day's completed rows that settle into the persistent "Completed"
  // tail. Keyed on the local day so the list empties at the midnight rollover.
  const completedToday = useMemo(
    () =>
      selectCompletionsToday(recentlyCompleted, localDate, tzOffsetMinutes).map((t) => ({
        id: t.id,
        title: t.title,
        completedAt: t.completedAt,
        category: t.category,
        categoryUnresolved: t.categoryUnresolved,
      })),
    [recentlyCompleted, localDate, tzOffsetMinutes]
  );

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

  const taskTitleById = useMemo(
    () => Object.fromEntries(tasks.map((t) => [t.id, t.title])),
    [tasks]
  );

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
    category: task.category,
    categoryUnresolved: task.categoryUnresolved,
    tags: task.tags ?? [],
    scheduledDate: task.scheduledDate,
    phaseName: task.phaseName,
    phaseSortOrder: task.phaseSortOrder,
    isRecurringOccurrence: task.isRecurringOccurrence,
    recurrenceId: task.recurrenceId,
    occurrenceDate: task.occurrenceDate,
    templateTaskId: task.templateTaskId,
    isBlocked: task.isBlocked,
    blockedByIds: task.blockedByIds,
    taskTitleById,
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
        top3PinnedAt: task.top3PinnedAt,
        scheduledDate: task.scheduledDate,
        completedAt: task.completedAt,
        category: task.category,
        categoryUnresolved: task.categoryUnresolved,
      });
    }
    return map;
  }, [top3Slots]);

  useEffect(() => {
    if (top3CelebratedRef.current) return;
    const allComplete = ([1, 2, 3] as const).every((slot) => {
      const task = pinnedBySlot.get(slot);
      return task != null && task.completedAt != null;
    });
    if (allComplete) {
      top3CelebratedRef.current = true;
      triggerEphemeralCelebration("top3-complete");
    }
  }, [pinnedBySlot]);

  const top3Assurance = useTop3Assurance({
    localDate,
    tzOffsetMinutes,
    pinnedBySlot,
    dayStartHour,
    dayEndHour,
    top3MiddayCheckin,
  });

  // Hot-path drag/pin actions: patch the cache in onMutate so the list
  // repartitions / the Top-3 slot fills instantly, roll back on error, and let
  // onSettled's invalidatePlan reconcile against the server.
  const moveMutation = useMutation(
    trpc.tasks.moveToBucket.mutationOptions({
      onMutate: async ({ id, bucket }) => {
        const fields = bucketToSchedulingFields(bucket);
        const snapshot = await optimisticPatch<IncompleteTask[]>(
          queryClient,
          trpc.tasks.listIncomplete.queryKey(),
          (old) => old.map((t) => (t.id === id ? { ...t, ...fields } : t))
        );
        return { snapshots: [snapshot] };
      },
      onSuccess: () => touchActivity(),
      onError: (_err, _vars, ctx) => {
        rollbackPatches(queryClient, ctx?.snapshots);
        notifyMutationError();
      },
      onSettled: () => invalidatePlan(),
    })
  );

  const scheduleMutation = useMutation(
    trpc.tasks.scheduleToDate.mutationOptions({
      onMutate: async ({ id, scheduledDate }) => {
        const snapshot = await optimisticPatch<IncompleteTask[]>(
          queryClient,
          trpc.tasks.listIncomplete.queryKey(),
          (old) =>
            old.map((t) =>
              t.id === id
                ? {
                    ...t,
                    scheduledDate,
                    bucketOverride: scheduledDate !== null ? null : t.bucketOverride,
                  }
                : t
            )
        );
        return { snapshots: [snapshot] };
      },
      onSuccess: () => touchActivity(),
      onError: (_err, _vars, ctx) => {
        rollbackPatches(queryClient, ctx?.snapshots);
        notifyMutationError();
      },
      onSettled: () => invalidatePlan(),
    })
  );

  const pinMutation = useMutation(
    trpc.tasks.pinTop3.mutationOptions({
      onMutate: async ({ id, slot }) => {
        const todayFields = bucketToSchedulingFields("today");
        const pinnedAt = new Date();
        const incompleteKey = trpc.tasks.listIncomplete.queryKey();
        const top3Key = trpc.tasks.listTop3Slots.queryKey(top3QueryInput);

        const incompleteSnap = await optimisticPatch<IncompleteTask[]>(
          queryClient,
          incompleteKey,
          (old) =>
            old.map((t) => {
              if (t.id === id) return { ...t, isTop3: true, top3Order: slot, ...todayFields };
              // Pinning evicts whoever held this slot (the server does the same).
              if (t.isTop3 && t.top3Order === slot) {
                return { ...t, isTop3: false, top3Order: null };
              }
              return t;
            })
        );

        const source = queryClient
          .getQueryData<IncompleteTask[]>(incompleteKey)
          ?.find((t) => t.id === id);

        const top3Snap = await optimisticPatch<Top3SlotRow[]>(queryClient, top3Key, (old) => {
          const withoutSlotAndSelf = old.filter((t) => t.top3Order !== slot && t.id !== id);
          if (!source) return withoutSlotAndSelf;
          const entry: Top3SlotRow = {
            id: source.id,
            title: source.title,
            priority: source.priority,
            scheduledDate: todayFields.scheduledDate,
            bucketOverride: todayFields.bucketOverride,
            projectId: source.projectId,
            isTop3: true,
            top3Order: slot,
            top3PinnedAt: pinnedAt,
            completedAt: source.completedAt,
            createdAt: source.createdAt,
            projectSlug: source.projectSlug,
            projectName: source.projectName,
            category: source.category,
            categoryUnresolved: source.categoryUnresolved,
          };
          return [...withoutSlotAndSelf, entry].sort(
            (a, b) => (a.top3Order ?? 0) - (b.top3Order ?? 0)
          );
        });

        return { snapshots: [incompleteSnap, top3Snap] };
      },
      onSuccess: () => touchActivity(),
      onError: (_err, _vars, ctx) => {
        rollbackPatches(queryClient, ctx?.snapshots);
        notifyMutationError();
      },
      onSettled: () => invalidatePlan(),
    })
  );

  const unpinMutation = useMutation(
    trpc.tasks.unpinTop3.mutationOptions({
      onMutate: async ({ id }) => {
        const incompleteSnap = await optimisticPatch<IncompleteTask[]>(
          queryClient,
          trpc.tasks.listIncomplete.queryKey(),
          (old) => old.map((t) => (t.id === id ? { ...t, isTop3: false, top3Order: null } : t))
        );
        const top3Snap = await optimisticPatch<Top3SlotRow[]>(
          queryClient,
          trpc.tasks.listTop3Slots.queryKey(top3QueryInput),
          (old) => old.filter((t) => t.id !== id)
        );
        return { snapshots: [incompleteSnap, top3Snap] };
      },
      onSuccess: () => touchActivity(),
      onError: (_err, _vars, ctx) => {
        rollbackPatches(queryClient, ctx?.snapshots);
        notifyMutationError();
      },
      onSettled: () => invalidatePlan(),
    })
  );

  const handleSlipBreakDown = useCallback(
    (taskId: string) => {
      const task = Array.from(pinnedBySlot.values()).find((t) => t.id === taskId);
      const title = task?.title ?? "this task";
      openRail();
      window.dispatchEvent(
        new CustomEvent(CHAT_SEND_EVENT, {
          detail: `Help me break down "${title}" into smaller steps I can finish today.`,
        })
      );
      top3Assurance.dismissSlip(taskId);
    },
    [openRail, pinnedBySlot, top3Assurance]
  );

  const handleSlipDrop = useCallback(
    (taskId: string) => {
      unpinMutation.mutate({ id: taskId });
      top3Assurance.dismissSlip(taskId);
    },
    [top3Assurance, unpinMutation]
  );

  const handleSlipKeep = useCallback(
    (taskId: string) => {
      top3Assurance.dismissSlip(taskId);
    },
    [top3Assurance]
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
    trpc.focusBlocks.create.mutationOptions({
      onSuccess: invalidateBlocks,
      onError: notifyMutationError,
    })
  );

  const moveBlockMutation = useMutation(
    trpc.focusBlocks.move.mutationOptions({
      onSuccess: invalidateBlocks,
      onError: notifyMutationError,
    })
  );

  const validateFocusSlot = useCallback(
    (dateIso: string, startMin: number, durationMin: number): boolean => {
      const endMin = startMin + durationMin;
      const evaluation = evaluateProposedSlot(constraints, { dateIso, startMin, endMin });
      if (!evaluation.ok) {
        const label = evaluation.hardViolations[0]?.label ?? "a personal constraint";
        toast({ message: `That time overlaps ${label}.`, variant: "neutral" });
        return false;
      }
      if (evaluation.softViolations.length > 0) {
        const label = evaluation.softViolations[0]?.label ?? "a preference";
        toast({ message: `Placed anyway — overlaps ${label}.`, variant: "neutral" });
      }
      return true;
    },
    [constraints, toast]
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
      const startMin = timelineDropStartMin(overId);
      if (startMin == null) return;
      const blockId = activeId.slice("block:".length);
      if (validateFocusSlot(todayIso, startMin, DEFAULT_FOCUS_BLOCK_MIN)) {
        moveBlockMutation.mutate({ id: blockId, startMin });
      }
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
      const startMin = timelineDropStartMin(overId);
      if (startMin == null) return;
      if (validateFocusSlot(todayIso, startMin, DEFAULT_FOCUS_BLOCK_MIN)) {
        const droppedOnNow = overId === "timeline:now";
        const shouldOpenFocus = droppedOnNow || overlapsNow(startMin, DEFAULT_FOCUS_BLOCK_MIN);
        createBlockMutation.mutate(
          { taskId, date: todayIso, startMin },
          {
            onSuccess: (block) => {
              if (shouldOpenFocus) {
                const params = new URLSearchParams({ taskId, blockId: block.id });
                router.push(`/today/focus?${params.toString()}`);
              }
            },
          }
        );
      }
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
      <div className="flex flex-col gap-stack">
        <section
          className="flex flex-col gap-stack rounded-card border border-subtle bg-surface px-card-x py-card-y shadow-surface"
          aria-label="Today summary"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-h1 font-medium text-ink">
              Today
              <span className="ml-2 text-subtitle font-normal text-ink-faint">
                {weekdayLabel}, {monthDayLabel}
              </span>
            </h1>
            <InPageSwitcher
              options={VIEW_OPTIONS}
              value={view}
              onChange={changeView}
              ariaLabel="Today view"
            />
          </div>

          <Top3Slots
            ref={top3SectionRef}
            pinnedBySlot={pinnedBySlot}
            highlighted={top3Highlighted}
            middayLine={top3Assurance.middayLine}
            slipTask={top3Assurance.slipTask}
            onSlipBreakDown={handleSlipBreakDown}
            onSlipDrop={handleSlipDrop}
            onSlipKeep={handleSlipKeep}
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

          {/* D11/V3: balance bar hidden until ≥2 tasks (ghost strip lives in compact Top-3). */}
          {todayTasks.length >= 2 ? (
            <div className="flex items-center gap-3">
              <span className="w-14 shrink-0 text-caption uppercase tracking-wide text-ink-faint">
                Balance
              </span>
              <BalanceBar
                tasks={todayTasks}
                weeklyTiltCaption={weekPayload?.weeklyTiltCaption ?? null}
              />
            </div>
          ) : null}
        </section>

        {view === "review" ? (
          <TodayReviewPanel localDate={localDate} tzOffsetMinutes={tzOffsetMinutes} />
        ) : (
          <div className="flex flex-col gap-stack lg:flex-row">
            {view === "list" ? (
              <div className="min-w-0 flex-1 lg:basis-0">
                <div className="mb-3">
                  <LensControlBar collapseUntilUseful={todayTasks.length < 3} />
                </div>
                <TodayList
                  pulse={pulseTarget === "today"}
                  tasks={todayTasks.map(toRow)}
                  completions={completedToday}
                  isLoading={isLoading}
                  selectedTaskId={selectedTaskId}
                  onSelectTask={setSelectedTaskId}
                  onActivateTask={handleActivateTask}
                  onComplete={pushComplete}
                  onUncomplete={pushUncomplete}
                  onDelete={pushDelete}
                  onPin={handlePinFromToday}
                />
              </div>
            ) : null}
            <TimelinePane
              planItemCount={todayTasks.length}
              density={view === "list" ? "rail" : "full"}
              className={view === "list" ? undefined : "min-w-0 flex-1 lg:basis-0"}
              top3HoldOffer={
                top3Assurance.showHoldGhost && top3Assurance.holdGhost
                  ? {
                      slot: top3Assurance.holdGhost,
                      show: true,
                      onConfirm: top3Assurance.confirmHold,
                      onDismiss: top3Assurance.declineHold,
                      confirming: top3Assurance.confirmingHold,
                    }
                  : null
              }
            />
          </div>
        )}

        <div className="sticky bottom-0 z-sticky border-t border-border bg-surface pb-1 pt-3">
          {composerOpen ? (
            <div
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setComposerOpen(false);
                  requestAnimationFrame(() => addTaskRef.current?.focusTrigger());
                }
              }}
            >
              <QuickInput
                ref={quickInputRef}
                draftStorageKey={COMPOSER_DRAFT_KEYS.planDay}
                onTaskCreated={handleTaskCreated}
              />
            </div>
          ) : (
            <AddTaskPopover
              ref={addTaskRef}
              onAskChat={() => openRail()}
              onTypeManually={() => {
                setComposerOpen(true);
                requestAnimationFrame(() => quickInputRef.current?.focus());
              }}
            />
          )}
        </div>
      </div>
      <WalkTimerOverlay open={walkOverlayOpen} onClose={() => setWalkOverlayOpen(false)} />
      <BreathingOverlay open={breatheOverlayOpen} onClose={() => setBreatheOverlayOpen(false)} />
    </DndContext>
  );
}

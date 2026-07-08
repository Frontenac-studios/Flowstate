"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import "./week-motion.css";

import { useToast } from "@/components/kash/ui/ToastProvider";
import { COMPOSER_DRAFT_KEYS } from "@/lib/composer/composer-draft-constants";
import { weekHasPlanningData } from "@/lib/week/week-has-data";
import { useLocalCalendarClock } from "@/hooks/useLocalCalendarDate";
import { useSessionUndo } from "@/hooks/useSessionUndo";
import {
  addDays,
  datesInIsoWeek,
  parseISODateString,
  startOfIsoWeekMonday,
  toISODateString,
} from "@/lib/dates/local-day";
import { computeWeekDayLoads } from "@/lib/week/day-load";
import { isDayOverCommitted } from "@/lib/week/over-commit-threshold";
import { partitionWeekTasks } from "@/lib/week/partition-week-tasks";
import { useTRPC } from "@/trpc/client";

import { useChat } from "../../chat/ChatProvider";
import { createCaptureContext } from "@/lib/chat/capture-context";
import { onChatTasksCreated } from "@/lib/chat/chat-task-created-events";
import { AddTaskPopover, type AddTaskPopoverHandle } from "../AddTaskPopover";
import { usePlanMode } from "../PlanProvider";
import { QuickInput, type QuickInputHandle } from "../QuickInput";
import { Top3ReplacePicker } from "../Top3ReplacePicker";
import type { Top3SlotTask } from "../Top3Slots";
import type { PlanTaskRow } from "../TaskRow";
import type { DayPrioritySlotTask } from "./DayPrioritiesSlots";

import { WeekColumn } from "./WeekColumn";
import { WeekDragOverlay } from "./WeekDragOverlay";
import { WeekDraftPanel } from "./WeekDraftPanel";
import { WeekInbox } from "./WeekInbox";
import { WeekLaterBacklog } from "./WeekLaterBacklog";
import {
  WEEK_LATER_BACKLOG_DROP_ID,
  WEEK_LATER_NEXT_WEEK_DROP_ID,
  WeekLaterColumn,
} from "./WeekLaterColumn";
import ProtectedWeekBar from "./ProtectedWeekBar";
import type { ProtectedBlockRow } from "./ProtectedBlockChip";

/** D40 (reverses D19) — neutral canvas-tint field behind the day columns; soft-gray day columns with the white today column popping against them (WeekColumn). */
const WEEK_CANVAS_BG = "var(--canvas)";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
/** Floor a day column can shrink to before the strip scrolls horizontally (narrow screens). */
const MIN_DAY_COLUMN = "8rem";
const MIN_DAY_COLUMN_PX = 128;
const LATER_COLUMN_WIDTH_PX = 168;
const VISIBLE_DAY_COLUMNS = 3;
const WEEK_GRID_HORIZONTAL_PAD_PX = 16;
const WEEK_GRID_GAP_PX = 16;
const DEFAULT_COMPOSER_HEIGHT_PX = 128;

function computeExecutionDayColumnWidth(viewportWidth: number): number {
  const gaps = VISIBLE_DAY_COLUMNS * WEEK_GRID_GAP_PX;
  const available = viewportWidth - WEEK_GRID_HORIZONTAL_PAD_PX - LATER_COLUMN_WIDTH_PX - gaps;
  return Math.max(MIN_DAY_COLUMN_PX, Math.floor(available / VISIBLE_DAY_COLUMNS));
}

const weekCollisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) return pointerHits;
  return closestCenter(args);
};

function firstFreeSlot(pinnedBySlot: Map<number, DayPrioritySlotTask>): 1 | 2 | 3 | null {
  for (const slot of [1, 2, 3] as const) {
    if (!pinnedBySlot.has(slot)) return slot;
  }
  return null;
}

function toReplacePickerMap(
  pinnedBySlot: Map<number, DayPrioritySlotTask>
): Map<number, Top3SlotTask> {
  const map = new Map<number, Top3SlotTask>();
  for (const slot of [1, 2, 3] as const) {
    const task = pinnedBySlot.get(slot);
    if (!task) continue;
    map.set(slot, {
      id: task.id,
      title: task.title,
      projectId: task.projectId,
      projectSlug: task.projectSlug,
      top3Order: task.priorityOrder,
      top3PinnedAt: null,
      scheduledDate: null,
      completedAt: task.completedAt,
    });
  }
  return map;
}

type WeekCanvasProps = {
  /** Monday ISO date anchoring the week columns; defaults to the user's local today. */
  anchorDate?: string;
  /** When false, hides the inbox rail and later backlog (execution-only view). */
  showPlanningRail?: boolean;
  /** D21 — hide ritual bar when the week has no plan data yet. */
  showWeekChrome?: boolean;
  /**
   * "week" (this-week execution surface): grid leads as a horizontal scroll
   * strip with an 8th "Later" defer column; composer/inbox/ritual collapse
   * below it. "plan" keeps the fill-width grid with planning chrome above.
   */
  surface?: "week" | "plan";
};

export function WeekCanvas({
  anchorDate: anchorDateProp,
  showPlanningRail = true,
  showWeekChrome = true,
  surface = "plan",
}: WeekCanvasProps = {}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const notifyMutationError = useCallback(
    () => toast({ message: "That change didn't save. Please try again.", variant: "error" }),
    [toast]
  );
  const { touchActivity } = usePlanMode();
  const { openRail } = useChat();
  const { pushComplete, pushDelete } = useSessionUndo();
  const [draftOpen, setDraftOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [appliedMessage, setAppliedMessage] = useState<string | null>(null);
  // Ids of chat-created tasks to pulse; cleared ~2s after the create event.
  const [chatHighlightIds, setChatHighlightIds] = useState<Set<string>>(new Set());
  const highlightClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [composerHeight, setComposerHeight] = useState(DEFAULT_COMPOSER_HEIGHT_PX);
  const [replacePicker, setReplacePicker] = useState<{
    taskId: string;
    isoDate: string;
    anchorEl: HTMLElement;
  } | null>(null);
  const [dayColumnWidthPx, setDayColumnWidthPx] = useState(MIN_DAY_COLUMN_PX);
  const [activeDragTask, setActiveDragTask] = useState<PlanTaskRow | null>(null);

  const composerMeasureRef = useRef<HTMLDivElement>(null);
  const quickInputRef = useRef<QuickInputHandle>(null);
  const addTaskRef = useRef<AddTaskPopoverHandle>(null);
  const dayScrollRef = useRef<HTMLDivElement>(null);
  const todayColumnRef = useRef<HTMLDivElement>(null);
  const hasPinnedTodayRef = useRef(false);

  const { localDate: todayIso } = useLocalCalendarClock();
  const anchorDate = anchorDateProp ?? todayIso;
  const weekRef = useMemo(() => parseISODateString(anchorDate), [anchorDate]);
  const weekDates = useMemo(() => datesInIsoWeek(weekRef), [weekRef]);
  const dayCount = weekDates.length;
  const todayInWeek = weekDates.some((date) => toISODateString(date) === todayIso);

  const { data: tasks = [], isLoading } = useQuery(trpc.tasks.listIncomplete.queryOptions());
  const weekQueryInput = useMemo(() => ({ anchorDate }), [anchorDate]);
  const { data: protectedBlocks = [] } = useQuery(
    trpc.protectedBlocks.listForWeek.queryOptions(weekQueryInput)
  );
  const { data: dayPriorities = [] } = useQuery(
    trpc.weekDayPriorities.listForWeek.queryOptions(weekQueryInput)
  );
  const { data: overCommitThreshold } = useQuery(trpc.weekOverCommit.getThreshold.queryOptions());

  const prioritiesByDate = useMemo(() => {
    const map: Record<string, Map<number, DayPrioritySlotTask>> = {};
    for (const row of dayPriorities) {
      const dayMap = map[row.scheduledDate] ?? new Map<number, DayPrioritySlotTask>();
      dayMap.set(row.priorityOrder, {
        id: row.taskId,
        title: row.title,
        projectId: row.projectId,
        projectSlug: row.projectSlug,
        priorityOrder: row.priorityOrder,
        completedAt: row.completedAt,
      });
      map[row.scheduledDate] = dayMap;
    }
    return map;
  }, [dayPriorities]);

  const dayPriorityOrderByTaskId = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of dayPriorities) {
      map.set(row.taskId, row.priorityOrder);
    }
    return map;
  }, [dayPriorities]);

  const protectedByDate = useMemo(() => {
    const map: Record<string, ProtectedBlockRow[]> = {};
    for (const block of protectedBlocks) {
      const list = map[block.scheduledDate] ?? [];
      list.push(block);
      map[block.scheduledDate] = list;
    }
    return map;
  }, [protectedBlocks]);

  const partitioned = useMemo(() => partitionWeekTasks(tasks, weekRef), [tasks, weekRef]);

  useEffect(() => {
    const unsubscribe = onChatTasksCreated((detail) => {
      const ids = detail.tasks.map((task) => task.id);
      if (ids.length === 0) return;
      setChatHighlightIds(new Set(ids));
      if (highlightClearRef.current) clearTimeout(highlightClearRef.current);
      highlightClearRef.current = setTimeout(() => setChatHighlightIds(new Set()), 2000);
    });
    return () => {
      unsubscribe();
      if (highlightClearRef.current) clearTimeout(highlightClearRef.current);
    };
  }, []);

  const inboxTaskIds = useMemo(
    () => new Set(partitioned.inbox.map((task) => task.id)),
    [partitioned.inbox]
  );

  // Only the created tasks that actually landed unscheduled (in the inbox) drive
  // the inbox pulse + force-expand; project/day-scheduled creates are ignored here.
  const inboxHighlightIds = useMemo(() => {
    if (chatHighlightIds.size === 0) return null;
    const result = new Set<string>();
    for (const id of Array.from(chatHighlightIds)) {
      if (inboxTaskIds.has(id)) result.add(id);
    }
    return result.size > 0 ? result : null;
  }, [chatHighlightIds, inboxTaskIds]);

  const weekDateIsos = useMemo(() => weekDates.map(toISODateString), [weekDates]);

  const hasWeekPlanData = useMemo(
    () =>
      weekHasPlanningData({
        weekDates: weekDateIsos,
        tasks,
        protectedBlockCount: protectedBlocks.length,
        dayPriorityCount: dayPriorities.length,
      }) || partitioned.inbox.length > 0,
    [weekDateIsos, tasks, protectedBlocks.length, dayPriorities.length, partitioned.inbox.length]
  );

  const showChrome = showWeekChrome && hasWeekPlanData;

  const priorityTaskIdsByDate = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const [iso, pinnedBySlot] of Object.entries(prioritiesByDate)) {
      map[iso] = new Set(Array.from(pinnedBySlot.values()).map((task) => task.id));
    }
    return map;
  }, [prioritiesByDate]);

  const protectedCountByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const [iso, blocks] of Object.entries(protectedByDate)) {
      map[iso] = blocks.length;
    }
    return map;
  }, [protectedByDate]);

  const dayLoads = useMemo(
    () =>
      computeWeekDayLoads({
        dates: weekDates.map(toISODateString),
        tasksByDate: Object.fromEntries(
          weekDates.map((date) => [
            toISODateString(date),
            partitioned.byDate[toISODateString(date)] ?? [],
          ])
        ),
        priorityTaskIdsByDate,
        protectedCountByDate,
      }),
    [weekDates, partitioned.byDate, priorityTaskIdsByDate, protectedCountByDate]
  );

  const overCommittedByDate = useMemo(() => {
    if (!overCommitThreshold) return {};
    const map: Record<string, boolean> = {};
    for (const [iso, load] of Object.entries(dayLoads)) {
      map[iso] = isDayOverCommitted(load, overCommitThreshold.threshold);
    }
    return map;
  }, [dayLoads, overCommitThreshold]);

  const invalidatePlan = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
    void queryClient.invalidateQueries({
      queryKey: trpc.protectedBlocks.listForWeek.queryKey(weekQueryInput),
    });
    void queryClient.invalidateQueries({
      queryKey: trpc.weekDayPriorities.listForWeek.queryKey(weekQueryInput),
    });
  }, [
    queryClient,
    trpc.tasks.listIncomplete,
    trpc.protectedBlocks.listForWeek,
    trpc.weekDayPriorities.listForWeek,
    weekQueryInput,
  ]);

  const scheduleMutation = useMutation(
    trpc.tasks.scheduleToDate.mutationOptions({
      onSuccess: () => {
        touchActivity();
        invalidatePlan();
      },
      onError: notifyMutationError,
    })
  );

  const rescheduleOccurrenceMutation = useMutation(
    trpc.recurrence.rescheduleOccurrence.mutationOptions({
      onSuccess: () => {
        touchActivity();
        invalidatePlan();
      },
      onError: notifyMutationError,
    })
  );

  const skipOccurrenceMutation = useMutation(
    trpc.recurrence.skipOccurrence.mutationOptions({
      onSuccess: () => {
        touchActivity();
        invalidatePlan();
      },
      onError: notifyMutationError,
    })
  );

  const dropToAbyssMutation = useMutation(
    trpc.abyss.dropFromTask.mutationOptions({
      onSuccess: () => {
        touchActivity();
        invalidatePlan();
        void queryClient.invalidateQueries({ queryKey: trpc.abyss.list.queryKey() });
      },
      onError: notifyMutationError,
    })
  );

  const removeProtectedMutation = useMutation(
    trpc.protectedBlocks.remove.mutationOptions({
      onSuccess: () => {
        touchActivity();
        invalidatePlan();
      },
      onError: notifyMutationError,
    })
  );

  const pinPriorityMutation = useMutation(
    trpc.weekDayPriorities.pin.mutationOptions({
      onSuccess: () => {
        touchActivity();
        invalidatePlan();
      },
      onError: notifyMutationError,
    })
  );

  const unpinPriorityMutation = useMutation(
    trpc.weekDayPriorities.unpin.mutationOptions({
      onSuccess: () => {
        touchActivity();
        invalidatePlan();
      },
      onError: notifyMutationError,
    })
  );

  const toRow = (task: (typeof tasks)[number]): PlanTaskRow => ({
    id: task.id,
    title: task.title,
    priority: task.priority,
    projectId: task.projectId,
    projectSlug: task.projectSlug,
    projectName: task.projectName,
    isTop3: task.isTop3,
    dayPriorityOrder: dayPriorityOrderByTaskId.get(task.id) ?? null,
    category: task.category,
    categoryUnresolved: task.categoryUnresolved,
    tags: task.tags ?? [],
    scheduledDate: task.scheduledDate,
    suggestedScheduledDate: task.suggestedScheduledDate,
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

  const findTaskById = (taskId: string) => tasks.find((t) => t.id === taskId);

  const taskTitleById = useMemo(
    () => Object.fromEntries(tasks.map((t) => [t.id, t.title])),
    [tasks]
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handlePinTask = useCallback(
    (isoDate: string, taskId: string, sourceEl: HTMLElement) => {
      const pinnedBySlot = prioritiesByDate[isoDate] ?? new Map();
      const slot = firstFreeSlot(pinnedBySlot);

      if (slot != null) {
        pinPriorityMutation.mutate({ taskId, scheduledDate: isoDate, slot });
        return;
      }

      setReplacePicker({ taskId, isoDate, anchorEl: sourceEl });
    },
    [prioritiesByDate, pinPriorityMutation]
  );

  const handleUnpinPriority = useCallback(
    (isoDate: string, taskId: string) => {
      unpinPriorityMutation.mutate({ taskId, scheduledDate: isoDate });
    },
    [unpinPriorityMutation]
  );

  const handleReplaceSlot = useCallback(
    (slot: 1 | 2 | 3) => {
      if (!replacePicker) return;
      pinPriorityMutation.mutate({
        taskId: replacePicker.taskId,
        scheduledDate: replacePicker.isoDate,
        slot,
      });
      setReplacePicker(null);
    },
    [replacePicker, pinPriorityMutation]
  );

  const onDragStart = (event: DragStartEvent) => {
    const activeId = String(event.active.id);
    if (!activeId.startsWith("task:")) return;

    const taskId = activeId.slice("task:".length);
    const task = findTaskById(taskId);
    if (task) setActiveDragTask(toRow(task));
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveDragTask(null);

    const overId = event.over?.id;
    if (!overId || typeof overId !== "string") return;

    const activeId = String(event.active.id);
    if (!activeId.startsWith("task:")) return;

    const taskId = activeId.slice("task:".length);
    const task = findTaskById(taskId);

    if (overId === "week-inbox") {
      if (task?.isRecurringOccurrence && task.recurrenceId && task.occurrenceDate) {
        skipOccurrenceMutation.mutate({
          recurrenceId: task.recurrenceId,
          occurrenceDate: task.occurrenceDate,
        });
        return;
      }
      scheduleMutation.mutate({ id: taskId, scheduledDate: null });
      return;
    }

    if (overId === WEEK_LATER_NEXT_WEEK_DROP_ID) {
      const nextMondayIso = toISODateString(addDays(startOfIsoWeekMonday(weekRef), 7));
      if (task?.isRecurringOccurrence && task.recurrenceId && task.occurrenceDate) {
        rescheduleOccurrenceMutation.mutate({
          recurrenceId: task.recurrenceId,
          occurrenceDate: task.occurrenceDate,
          movedToDate: nextMondayIso,
        });
        return;
      }
      scheduleMutation.mutate({ id: taskId, scheduledDate: nextMondayIso });
      return;
    }

    if (overId === WEEK_LATER_BACKLOG_DROP_ID) {
      // Parking one occurrence of a recurring task in the backlog would delete
      // the whole series — skip just this week's occurrence instead.
      if (task?.isRecurringOccurrence) {
        if (task.recurrenceId && task.occurrenceDate) {
          skipOccurrenceMutation.mutate({
            recurrenceId: task.recurrenceId,
            occurrenceDate: task.occurrenceDate,
          });
        }
        return;
      }
      dropToAbyssMutation.mutate({ id: taskId });
      return;
    }

    if (overId.startsWith("week-day:")) {
      const iso = overId.slice("week-day:".length);
      if (task?.isRecurringOccurrence && task.recurrenceId && task.occurrenceDate) {
        rescheduleOccurrenceMutation.mutate({
          recurrenceId: task.recurrenceId,
          occurrenceDate: task.occurrenceDate,
          movedToDate: iso,
        });
        return;
      }
      scheduleMutation.mutate({ id: taskId, scheduledDate: iso });
    }
  };

  useEffect(() => {
    const el = composerMeasureRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height;
      if (height && height > 0) setComposerHeight(height);
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (surface !== "week") return;

    const scrollEl = dayScrollRef.current;
    if (!scrollEl || typeof ResizeObserver === "undefined") return;

    const measureWidth = () => {
      const width = scrollEl.clientWidth;
      if (width > 0) {
        setDayColumnWidthPx(computeExecutionDayColumnWidth(width));
      }
    };

    measureWidth();
    const observer = new ResizeObserver(measureWidth);
    observer.observe(scrollEl);
    return () => observer.disconnect();
  }, [surface, isLoading, dayCount]);

  useEffect(() => {
    hasPinnedTodayRef.current = false;
  }, [todayIso, anchorDate, dayColumnWidthPx]);

  useEffect(() => {
    if (isLoading || !todayInWeek) return;

    const pinTodayToLeft = () => {
      if (hasPinnedTodayRef.current) return;

      const scrollEl = dayScrollRef.current;
      const todayEl = todayColumnRef.current;
      if (!scrollEl || !todayEl) return;

      scrollEl.scrollLeft = todayEl.offsetLeft - scrollEl.offsetLeft;
      hasPinnedTodayRef.current = true;
    };

    let outerFrame = 0;
    let innerFrame = 0;

    outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(pinTodayToLeft);
    });

    const scrollEl = dayScrollRef.current;
    let observer: ResizeObserver | undefined;

    if (scrollEl && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        if (!hasPinnedTodayRef.current) pinTodayToLeft();
      });
      observer.observe(scrollEl);
    }

    return () => {
      cancelAnimationFrame(outerFrame);
      cancelAnimationFrame(innerFrame);
      observer?.disconnect();
    };
  }, [isLoading, todayIso, dayCount, todayInWeek, anchorDate, dayColumnWidthPx]);

  // The inbox rail height tracks the composer, but the composer collapses to a
  // small "+" by default (Phase 5). Fall back to the default composer height so
  // the rail keeps a sane size when collapsed instead of shrinking to the "+".
  const inboxHeightPx = (composerOpen ? composerHeight : DEFAULT_COMPOSER_HEIGHT_PX) * 1.5;

  const gridTemplateColumns =
    surface === "week"
      ? `repeat(${dayCount}, ${dayColumnWidthPx}px) ${LATER_COLUMN_WIDTH_PX}px`
      : `repeat(${dayCount}, minmax(${MIN_DAY_COLUMN}, 1fr))`;

  const dayGrid = (
    <div
      ref={dayScrollRef}
      className={`week-day-scroll mt-stack rounded-card p-2 ${
        surface === "week"
          ? "min-h-0 flex-1 overflow-x-auto overflow-y-hidden"
          : "shrink-0 overflow-x-auto"
      }`}
      style={{ backgroundColor: WEEK_CANVAS_BG }}
    >
      <div
        className={`grid gap-stack ${surface === "week" ? "h-full min-h-0 items-stretch" : ""}`}
        style={{ gridTemplateColumns }}
      >
        {weekDates.map((date, index) => {
          const iso = toISODateString(date);
          const isToday = iso === todayIso;
          const pinnedBySlot = prioritiesByDate[iso] ?? new Map<number, DayPrioritySlotTask>();
          return (
            <WeekColumn
              key={iso}
              ref={isToday ? todayColumnRef : undefined}
              isoDate={iso}
              label={WEEKDAY_LABELS[index]!}
              isToday={isToday}
              tasks={(partitioned.byDate[iso] ?? []).map(toRow)}
              pinnedBySlot={pinnedBySlot}
              protectedBlocks={protectedByDate[iso] ?? []}
              overCommitted={overCommittedByDate[iso] ?? false}
              overCommitMode={overCommitThreshold?.mode ?? "cold-start"}
              fillHeight={surface === "week"}
              onComplete={pushComplete}
              onDelete={pushDelete}
              onRemoveProtected={(id) => removeProtectedMutation.mutate({ id })}
              onPinTask={(taskId, sourceEl) => handlePinTask(iso, taskId, sourceEl)}
              onUnpinPriority={(taskId) => handleUnpinPriority(iso, taskId)}
              canPinMore={pinnedBySlot.size < 3}
              showPinHint={isToday && pinnedBySlot.size === 0}
            />
          );
        })}
        {surface === "week" ? (
          <div className="h-full min-h-0">
            <WeekLaterColumn />
          </div>
        ) : null}
      </div>
    </div>
  );

  const inboxRail = showPlanningRail ? (
    <WeekInbox
      tasks={partitioned.inbox.map(toRow)}
      heightPx={inboxHeightPx}
      collapseWhenEmpty={surface === "week"}
      highlightTaskIds={inboxHighlightIds ?? undefined}
      forceExpanded={(inboxHighlightIds?.size ?? 0) > 0}
      onComplete={pushComplete}
      onDelete={pushDelete}
      onDraftClick={() => {
        setDraftOpen(true);
        setAppliedMessage(null);
      }}
      appliedMessage={appliedMessage}
      draftPanel={
        draftOpen ? (
          <WeekDraftPanel
            anchorDate={anchorDate}
            taskTitleById={taskTitleById}
            onClose={() => setDraftOpen(false)}
            onApplied={(count) => {
              setAppliedMessage(`Moved ${count} task${count === 1 ? "" : "s"}`);
              setDraftOpen(false);
            }}
          />
        ) : null
      }
    />
  ) : null;

  const chromeBar = showChrome ? (
    <ProtectedWeekBar anchorDate={anchorDate} compact={surface === "week"} />
  ) : null;

  const loadingNote = <p className="mt-4 px-2 text-sm text-ink-muted">Loading…</p>;

  // Chat-first composer (#194): collapses to a "+" popover offering "ask chat"
  // or "type manually"; shared by both surfaces (positioned per surface below).
  const composerBlock = (
    <div ref={composerMeasureRef}>
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
            draftStorageKey={COMPOSER_DRAFT_KEYS.planWeek}
            createInInbox
            onTaskCreated={() => touchActivity()}
          />
        </div>
      ) : (
        <AddTaskPopover
          ref={addTaskRef}
          onAskChat={() =>
            openRail({
              captureContext: createCaptureContext({
                surface: "week",
                defaultBucket: "inbox",
              }),
            })
          }
          onTypeManually={() => {
            setComposerOpen(true);
            requestAnimationFrame(() => quickInputRef.current?.focus());
          }}
        />
      )}
    </div>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={weekCollisionDetection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {surface === "week" ? (
        isLoading ? (
          loadingNote
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            {dayGrid}
            <div className="shrink-0">{composerBlock}</div>
            {inboxRail}
            {chromeBar}
          </div>
        )
      ) : (
        <>
          {composerBlock}
          {isLoading ? (
            loadingNote
          ) : (
            <>
              {inboxRail}
              {chromeBar}
              {dayGrid}
              {showPlanningRail ? (
                <WeekLaterBacklog
                  tasks={partitioned.later.map(toRow)}
                  onComplete={pushComplete}
                  onDelete={pushDelete}
                />
              ) : null}
            </>
          )}
        </>
      )}

      {replacePicker ? (
        <Top3ReplacePicker
          pinnedBySlot={toReplacePickerMap(
            prioritiesByDate[replacePicker.isoDate] ?? new Map<number, DayPrioritySlotTask>()
          )}
          anchorEl={replacePicker.anchorEl}
          onReplace={handleReplaceSlot}
          onDismiss={() => setReplacePicker(null)}
        />
      ) : null}

      <DragOverlay
        dropAnimation={{
          duration: 200,
          easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
        }}
      >
        <WeekDragOverlay task={activeDragTask} />
      </DragOverlay>
    </DndContext>
  );
}

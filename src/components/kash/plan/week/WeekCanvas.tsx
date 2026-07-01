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

import "./week-motion.css";

import { COMPOSER_DRAFT_KEYS } from "@/lib/composer/composer-draft-constants";
import { useLocalCalendarClock } from "@/hooks/useLocalCalendarDate";
import { useSessionUndo } from "@/hooks/useSessionUndo";
import { datesInIsoWeek, parseISODateString, toISODateString } from "@/lib/dates/local-day";
import { computeWeekDayLoads } from "@/lib/week/day-load";
import { isDayOverCommitted } from "@/lib/week/over-commit-threshold";
import { partitionWeekTasks } from "@/lib/week/partition-week-tasks";
import { useTRPC } from "@/trpc/client";

import { usePlanMode } from "../PlanProvider";
import { QuickInput } from "../QuickInput";
import { Top3ReplacePicker } from "../Top3ReplacePicker";
import type { Top3SlotTask } from "../Top3Slots";
import type { PlanTaskRow } from "../TaskRow";
import type { DayPrioritySlotTask } from "./DayPrioritiesSlots";
import { WeekColumn } from "./WeekColumn";
import { WeekDraftPanel } from "./WeekDraftPanel";
import { WeekInbox } from "./WeekInbox";
import { WeekLaterBacklog } from "./WeekLaterBacklog";
import ProtectedWeekBar from "./ProtectedWeekBar";
import type { ProtectedBlockRow } from "./ProtectedBlockChip";

/** Inverted week track (Kash 3.0): soft-gray surface the day columns sit on. */
const WEEK_TRACK_BG = "color-mix(in srgb, var(--ink) 4%, var(--surface))";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const VISIBLE_DAY_COUNT = 4;
const DEFAULT_COMPOSER_HEIGHT_PX = 128;

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
};

export function WeekCanvas({
  anchorDate: anchorDateProp,
  showPlanningRail = true,
}: WeekCanvasProps = {}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { touchActivity } = usePlanMode();
  const { pushComplete, pushDelete } = useSessionUndo();
  const [draftOpen, setDraftOpen] = useState(false);
  const [appliedMessage, setAppliedMessage] = useState<string | null>(null);
  const [composerHeight, setComposerHeight] = useState(DEFAULT_COMPOSER_HEIGHT_PX);
  const [replacePicker, setReplacePicker] = useState<{
    taskId: string;
    isoDate: string;
    anchorEl: HTMLElement;
  } | null>(null);

  const composerMeasureRef = useRef<HTMLDivElement>(null);
  const dayScrollRef = useRef<HTMLDivElement>(null);
  const todayColumnRef = useRef<HTMLDivElement>(null);
  const hasPinnedTodayRef = useRef(false);

  const { localDate: todayIso } = useLocalCalendarClock();
  const anchorDate = anchorDateProp ?? todayIso;
  const weekRef = useMemo(() => parseISODateString(anchorDate), [anchorDate]);
  const weekDates = useMemo(() => datesInIsoWeek(weekRef), [weekRef]);
  const dayCount = weekDates.length;
  const columnWidthPercent = 100 / dayCount;
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
    })
  );

  const rescheduleOccurrenceMutation = useMutation(
    trpc.recurrence.rescheduleOccurrence.mutationOptions({
      onSuccess: () => {
        touchActivity();
        invalidatePlan();
      },
    })
  );

  const skipOccurrenceMutation = useMutation(
    trpc.recurrence.skipOccurrence.mutationOptions({
      onSuccess: () => {
        touchActivity();
        invalidatePlan();
      },
    })
  );

  const removeProtectedMutation = useMutation(
    trpc.protectedBlocks.remove.mutationOptions({
      onSuccess: () => {
        touchActivity();
        invalidatePlan();
      },
    })
  );

  const pinPriorityMutation = useMutation(
    trpc.weekDayPriorities.pin.mutationOptions({
      onSuccess: () => {
        touchActivity();
        invalidatePlan();
      },
    })
  );

  const unpinPriorityMutation = useMutation(
    trpc.weekDayPriorities.unpin.mutationOptions({
      onSuccess: () => {
        touchActivity();
        invalidatePlan();
      },
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
    scheduledDate: task.scheduledDate,
    phaseName: task.phaseName,
    phaseSortOrder: task.phaseSortOrder,
    isRecurringOccurrence: task.isRecurringOccurrence,
    recurrenceId: task.recurrenceId,
    occurrenceDate: task.occurrenceDate,
    templateTaskId: task.templateTaskId,
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

  const onDragEnd = (event: DragEndEvent) => {
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
    hasPinnedTodayRef.current = false;
  }, [todayIso, anchorDate]);

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
  }, [isLoading, todayIso, dayCount, todayInWeek, anchorDate]);

  const inboxHeightPx = composerHeight * 1.5;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <div ref={composerMeasureRef}>
        <QuickInput
          draftStorageKey={COMPOSER_DRAFT_KEYS.planWeek}
          createInInbox
          onTaskCreated={() => touchActivity()}
        />
      </div>

      {isLoading ? (
        <p className="mt-4 px-2 text-sm text-ink-muted">Loading…</p>
      ) : (
        <>
          {showPlanningRail ? (
            <WeekInbox
              tasks={partitioned.inbox.map(toRow)}
              heightPx={inboxHeightPx}
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
          ) : null}

          <ProtectedWeekBar anchorDate={anchorDate} />

          <div
            ref={dayScrollRef}
            className="mt-4 overflow-x-auto rounded-card border border-subtle p-2"
            style={{ backgroundColor: WEEK_TRACK_BG }}
          >
            <div
              className="flex gap-2"
              style={{ width: `${(dayCount / VISIBLE_DAY_COUNT) * 100}%` }}
            >
              {weekDates.map((date, index) => {
                const iso = toISODateString(date);
                const isToday = iso === todayIso;
                const pinnedBySlot =
                  prioritiesByDate[iso] ?? new Map<number, DayPrioritySlotTask>();
                return (
                  <WeekColumn
                    key={iso}
                    ref={isToday ? todayColumnRef : undefined}
                    isoDate={iso}
                    label={WEEKDAY_LABELS[index]!}
                    isToday={isToday}
                    columnWidthPercent={columnWidthPercent}
                    tasks={(partitioned.byDate[iso] ?? []).map(toRow)}
                    pinnedBySlot={pinnedBySlot}
                    protectedBlocks={protectedByDate[iso] ?? []}
                    overCommitted={overCommittedByDate[iso] ?? false}
                    overCommitMode={overCommitThreshold?.mode ?? "cold-start"}
                    onComplete={pushComplete}
                    onDelete={pushDelete}
                    onRemoveProtected={(id) => removeProtectedMutation.mutate({ id })}
                    onPinTask={(taskId, sourceEl) => handlePinTask(iso, taskId, sourceEl)}
                    onUnpinPriority={(taskId) => handleUnpinPriority(iso, taskId)}
                    canPinMore={pinnedBySlot.size < 3}
                  />
                );
              })}
            </div>
          </div>

          {showPlanningRail ? (
            <WeekLaterBacklog
              tasks={partitioned.later.map(toRow)}
              onComplete={pushComplete}
              onDelete={pushDelete}
            />
          ) : null}
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
    </DndContext>
  );
}

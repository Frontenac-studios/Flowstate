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

import { COMPOSER_DRAFT_KEYS } from "@/lib/composer/composer-draft-constants";
import { useLocalCalendarClock } from "@/hooks/useLocalCalendarDate";
import { useSessionUndo } from "@/hooks/useSessionUndo";
import { datesInIsoWeek, toISODateString } from "@/lib/dates/local-day";
import { partitionWeekTasks } from "@/lib/week/partition-week-tasks";
import { useTRPC } from "@/trpc/client";

import { usePlanMode } from "../PlanProvider";
import { QuickInput } from "../QuickInput";
import type { PlanTaskRow } from "../TaskRow";
import { WeekColumn } from "./WeekColumn";
import { WeekDraftPanel } from "./WeekDraftPanel";
import { WeekInbox } from "./WeekInbox";
import { WeekLaterBacklog } from "./WeekLaterBacklog";

/** Inverted week track (Kash 3.0): soft-gray surface the day columns sit on. */
const WEEK_TRACK_BG = "color-mix(in srgb, var(--ink) 4%, var(--surface))";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const VISIBLE_DAY_COUNT = 4;
const DEFAULT_COMPOSER_HEIGHT_PX = 128;

export function WeekCanvas() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { touchActivity } = usePlanMode();
  const { pushComplete, pushDelete } = useSessionUndo();
  const [draftOpen, setDraftOpen] = useState(false);
  const [appliedMessage, setAppliedMessage] = useState<string | null>(null);
  const [composerHeight, setComposerHeight] = useState(DEFAULT_COMPOSER_HEIGHT_PX);

  const composerMeasureRef = useRef<HTMLDivElement>(null);
  const dayScrollRef = useRef<HTMLDivElement>(null);
  const todayColumnRef = useRef<HTMLDivElement>(null);
  const hasPinnedTodayRef = useRef(false);

  const { localDate: todayIso, now } = useLocalCalendarClock();
  const weekDates = useMemo(() => datesInIsoWeek(now), [now]);
  const dayCount = weekDates.length;
  const columnWidthPercent = 100 / dayCount;

  const { data: tasks = [], isLoading } = useQuery(trpc.tasks.listIncomplete.queryOptions());

  const partitioned = useMemo(() => partitionWeekTasks(tasks, now), [tasks, now]);

  const invalidatePlan = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
  }, [queryClient, trpc.tasks.listIncomplete]);

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
  }, [todayIso]);

  useEffect(() => {
    if (isLoading) return;

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
  }, [isLoading, todayIso, dayCount]);

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
        <p className="mt-4 px-2 text-sm text-kash-ink-muted">Loading…</p>
      ) : (
        <>
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

          <div
            ref={dayScrollRef}
            className="border-subtle mt-4 overflow-x-auto rounded-card border p-2"
            style={{ backgroundColor: WEEK_TRACK_BG }}
          >
            <div
              className="flex gap-2"
              style={{ width: `${(dayCount / VISIBLE_DAY_COUNT) * 100}%` }}
            >
              {weekDates.map((date, index) => {
                const iso = toISODateString(date);
                const isToday = iso === todayIso;
                return (
                  <WeekColumn
                    key={iso}
                    ref={isToday ? todayColumnRef : undefined}
                    isoDate={iso}
                    label={WEEKDAY_LABELS[index]!}
                    isToday={isToday}
                    columnWidthPercent={columnWidthPercent}
                    tasks={(partitioned.byDate[iso] ?? []).map(toRow)}
                    onComplete={pushComplete}
                    onDelete={pushDelete}
                  />
                );
              })}
            </div>
          </div>

          <WeekLaterBacklog
            tasks={partitioned.later.map(toRow)}
            onComplete={pushComplete}
            onDelete={pushDelete}
          />
        </>
      )}
    </DndContext>
  );
}

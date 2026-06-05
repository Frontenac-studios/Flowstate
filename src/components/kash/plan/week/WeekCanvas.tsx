"use client";

import { useCallback, useMemo, useState } from "react";
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

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeekCanvas() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { touchActivity } = usePlanMode();
  const { pushComplete, pushDelete } = useSessionUndo();
  const [draftOpen, setDraftOpen] = useState(false);
  const [appliedMessage, setAppliedMessage] = useState<string | null>(null);

  const { localDate: todayIso, now } = useLocalCalendarClock();
  const weekDates = useMemo(() => datesInIsoWeek(now), [now]);

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

  const toRow = (task: (typeof tasks)[number]): PlanTaskRow => ({
    id: task.id,
    title: task.title,
    priority: task.priority,
    projectId: task.projectId,
    projectSlug: task.projectSlug,
    projectName: task.projectName,
    isTop3: task.isTop3,
  });

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

    if (overId === "week-inbox") {
      scheduleMutation.mutate({ id: taskId, scheduledDate: null });
      return;
    }

    if (overId.startsWith("week-day:")) {
      const iso = overId.slice("week-day:".length);
      scheduleMutation.mutate({ id: taskId, scheduledDate: iso });
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <div className="mb-3 flex flex-wrap items-center gap-2 px-2">
        <button
          type="button"
          className="glass-pill px-3 py-1.5 text-sm text-kash-ink-muted transition hover:text-kash-ink"
          onClick={() => {
            setDraftOpen(true);
            setAppliedMessage(null);
          }}
        >
          Draft my week
        </button>
        {appliedMessage ? (
          <span className="text-sm text-kash-accent" role="status">
            {appliedMessage}
          </span>
        ) : null}
      </div>

      {draftOpen ? (
        <WeekDraftPanel
          taskTitleById={taskTitleById}
          onClose={() => setDraftOpen(false)}
          onApplied={(count) => {
            setAppliedMessage(`Moved ${count} task${count === 1 ? "" : "s"}`);
            setDraftOpen(false);
          }}
        />
      ) : null}

      <QuickInput
        draftStorageKey={COMPOSER_DRAFT_KEYS.planWeek}
        createInInbox
        onTaskCreated={() => touchActivity()}
      />

      {isLoading ? (
        <p className="mt-4 px-2 text-sm text-kash-ink-muted">Loading…</p>
      ) : (
        <div className="mt-4 overflow-x-auto pb-4">
          <div className="flex min-w-[900px] gap-2">
            <WeekInbox
              tasks={partitioned.inbox.map(toRow)}
              onComplete={pushComplete}
              onDelete={pushDelete}
            />
            {weekDates.map((date, index) => {
              const iso = toISODateString(date);
              return (
                <WeekColumn
                  key={iso}
                  isoDate={iso}
                  label={WEEKDAY_LABELS[index]!}
                  isToday={iso === todayIso}
                  tasks={(partitioned.byDate[iso] ?? []).map(toRow)}
                  onComplete={pushComplete}
                  onDelete={pushDelete}
                />
              );
            })}
          </div>
        </div>
      )}
    </DndContext>
  );
}

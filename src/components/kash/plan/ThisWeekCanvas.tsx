"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { useSessionUndo } from "@/hooks/useSessionUndo";
import type { Bucket } from "@/lib/tasks/derive-bucket";
import { partitionNamedDays } from "@/lib/tasks/partition-named-days";
import { partitionPlanTasks } from "@/lib/tasks/partition-plan-tasks";
import { resolvePulseTarget, type TaskCreatedPulse } from "@/lib/tasks/resolve-pulse-target";
import type { BucketMode } from "@/lib/settings/constants";
import { useTRPC } from "@/trpc/client";

import { usePlanMode } from "./PlanProvider";
import { QuickInput, type QuickInputHandle } from "./QuickInput";
import type { PlanTaskRow } from "./TaskRow";
import { PlanBuckets } from "./PlanBuckets";
import { PlanBucketsNamedDays } from "./PlanBucketsNamedDays";

const RELATIVE_BUCKETS = new Set<string>(["today", "tomorrow", "this_week", "later"]);

/**
 * The "This Week" view: upcoming buckets (Tomorrow / This Week / Later) that used
 * to crowd the Today page. Today now stays strictly today; future-dated work lives
 * here. New tasks default to the inbox so they flow through triage.
 */
export function ThisWeekCanvas() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { touchActivity } = usePlanMode();
  const quickInputRef = useRef<QuickInputHandle>(null);
  const [pulseTarget, setPulseTarget] = useState<string | null>(null);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { pushComplete, pushDelete } = useSessionUndo();

  const { data: settings } = useQuery(trpc.settings.get.queryOptions());
  const bucketMode: BucketMode = settings?.bucketMode ?? "relative";

  const now = useMemo(() => new Date(), []);

  const invalidatePlan = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listTriageCandidates.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listTop3Slots.queryKey() });
  }, [
    queryClient,
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

  const { data: tasks = [] } = useQuery(trpc.tasks.listIncomplete.queryOptions());
  const { data: triageTasks = [] } = useQuery(trpc.tasks.listTriageCandidates.queryOptions());

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

  const toRow = (task: (typeof tasks)[number]): PlanTaskRow => ({
    id: task.id,
    title: task.title,
    priority: task.priority,
    projectId: task.projectId,
    projectSlug: task.projectSlug,
    projectName: task.projectName,
    isTop3: task.isTop3,
  });

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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragEnd = (event: DragEndEvent) => {
    const overId = event.over?.id;
    if (!overId || typeof overId !== "string") return;

    const activeId = String(event.active.id);
    if (!activeId.startsWith("task:")) return;
    const taskId = activeId.slice("task:".length);

    if (!overId.startsWith("bucket:")) return;

    if (overId.startsWith("bucket:date:")) {
      const iso = overId.slice("bucket:date:".length);
      scheduleMutation.mutate({ id: taskId, scheduledDate: iso });
      triggerPulse(iso);
      return;
    }

    const bucketKey = overId.slice("bucket:".length);
    if (!RELATIVE_BUCKETS.has(bucketKey)) return;
    moveMutation.mutate({ id: taskId, bucket: bucketKey as Bucket });
    triggerPulse(bucketKey);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <QuickInput ref={quickInputRef} onTaskCreated={handleTaskCreated} createInInbox />
      <div className="mt-4">
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
    </DndContext>
  );
}

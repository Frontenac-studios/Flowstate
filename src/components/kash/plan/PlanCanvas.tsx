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

import { useSessionUndo } from "@/hooks/useSessionUndo";
import { partitionPlanTasks } from "@/lib/tasks/partition-plan-tasks";
import type { Bucket } from "@/lib/tasks/derive-bucket";
import { useTRPC } from "@/trpc/client";

import { QuickInput, type QuickInputHandle } from "./QuickInput";
import type { PlanTaskRow } from "./TaskRow";
import { PlanBuckets } from "./PlanBuckets";
import { TodayList } from "./TodayList";
import { Top3Slots, type Top3SlotTask } from "./Top3Slots";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

export function PlanCanvas() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const quickInputRef = useRef<QuickInputHandle>(null);
  const [pulseBucket, setPulseBucket] = useState<Bucket | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { pushComplete, pushDelete } = useSessionUndo();

  const invalidatePlan = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listTop3Slots.queryKey() });
  }, [queryClient, trpc.tasks.listIncomplete, trpc.tasks.listTop3Slots]);

  const triggerPulse = useCallback((bucket: Bucket) => {
    setPulseBucket(bucket);
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = setTimeout(() => setPulseBucket(null), 1500);
  }, []);

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
    };
  }, []);

  const { data: tasks = [], isLoading } = useQuery(trpc.tasks.listIncomplete.queryOptions());
  const { data: top3Slots = [] } = useQuery(trpc.tasks.listTop3Slots.queryOptions());
  const partitioned = partitionPlanTasks(tasks, new Date());

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
        invalidatePlan();
      },
    })
  );

  const pinMutation = useMutation(
    trpc.tasks.pinTop3.mutationOptions({
      onSuccess: () => {
        invalidatePlan();
      },
    })
  );

  const unpinMutation = useMutation(
    trpc.tasks.unpinTop3.mutationOptions({
      onSuccess: () => {
        invalidatePlan();
      },
    })
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragEnd = (event: DragEndEvent) => {
    const overId = event.over?.id;
    if (!overId || typeof overId !== "string") return;

    const activeId = String(event.active.id);
    if (!activeId.startsWith("task:")) return;

    const taskId = activeId.slice("task:".length);

    if (overId.startsWith("top3:")) {
      const slot = Number(overId.slice("top3:".length));
      if (slot !== 1 && slot !== 2 && slot !== 3) return;
      pinMutation.mutate({ id: taskId, slot });
      return;
    }

    if (!overId.startsWith("bucket:")) return;

    const bucket = overId.slice("bucket:".length) as Bucket;
    moveMutation.mutate({ id: taskId, bucket });
    triggerPulse(bucket);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <QuickInput ref={quickInputRef} onTaskCreated={triggerPulse} />
      <Top3Slots
        pinnedBySlot={pinnedBySlot}
        onUnpin={(taskId) => unpinMutation.mutate({ id: taskId })}
      />
      <TodayList
        pulse={pulseBucket === "today"}
        tasks={partitioned.today.map(toRow)}
        isLoading={isLoading}
        selectedTaskId={selectedTaskId}
        onSelectTask={setSelectedTaskId}
        onComplete={pushComplete}
        onDelete={pushDelete}
      />
      <PlanBuckets
        tasks={{
          tomorrow: partitioned.tomorrow.map(toRow),
          thisWeek: partitioned.thisWeek.map(toRow),
          later: partitioned.later.map(toRow),
        }}
        pulseBucket={pulseBucket}
        onComplete={pushComplete}
        onDelete={pushDelete}
      />
    </DndContext>
  );
}

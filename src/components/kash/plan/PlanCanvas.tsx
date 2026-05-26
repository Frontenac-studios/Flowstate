"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

export function PlanCanvas() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const quickInputRef = useRef<QuickInputHandle>(null);
  const [pulseBucket, setPulseBucket] = useState<Bucket | null>(null);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { pushComplete, pushDelete } = useSessionUndo();

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

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }

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

  const moveMutation = useMutation(
    trpc.tasks.moveToBucket.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
      },
    })
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragEnd = (event: DragEndEvent) => {
    const overId = event.over?.id;
    if (!overId || typeof overId !== "string" || !overId.startsWith("bucket:")) return;

    const activeId = String(event.active.id);
    if (!activeId.startsWith("task:")) return;

    const taskId = activeId.slice("task:".length);
    const bucket = overId.slice("bucket:".length) as Bucket;

    moveMutation.mutate({ id: taskId, bucket });
    triggerPulse(bucket);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <QuickInput ref={quickInputRef} onTaskCreated={triggerPulse} />
      <TodayList
        pulse={pulseBucket === "today"}
        tasks={partitioned.today.map(toRow)}
        isLoading={isLoading}
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

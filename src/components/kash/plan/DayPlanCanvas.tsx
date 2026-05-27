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

import { useSessionUndo } from "@/hooks/useSessionUndo";
import { partitionPlanTasks } from "@/lib/tasks/partition-plan-tasks";
import type { Bucket } from "@/lib/tasks/derive-bucket";
import { pickRdmTask } from "@/lib/rdm/pick-task";
import { useTRPC } from "@/trpc/client";

import { usePlanMode } from "./PlanProvider";
import { QuickInput, type QuickInputHandle } from "./QuickInput";
import type { PlanTaskRow } from "./TaskRow";
import { PlanBuckets } from "./PlanBuckets";
import { TodayList } from "./TodayList";
import { TriageStrip, type TriageAction, type TriageStripHandle } from "./TriageStrip";
import { Top3Slots, type Top3SlotTask } from "./Top3Slots";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

function isInTriageStrip(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  return target.closest("[data-triage-strip]") !== null;
}

function isQuickInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLTextAreaElement)) return false;
  return target.closest("[data-quick-input]") !== null;
}

export function DayPlanCanvas() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { touchActivity } = usePlanMode();
  const quickInputRef = useRef<QuickInputHandle>(null);
  const triageRef = useRef<TriageStripHandle>(null);
  const router = useRouter();
  const [pulseBucket, setPulseBucket] = useState<Bucket | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [triageFocusedIndex, setTriageFocusedIndex] = useState(0);
  const [triageKeyboardActive, setTriageKeyboardActive] = useState(false);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWasLargeRef = useRef(false);
  const { pushComplete, pushDelete } = useSessionUndo();

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
    (bucket: Bucket) => {
      touchActivity();
      setPulseBucket(bucket);
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
      pulseTimerRef.current = setTimeout(() => setPulseBucket(null), 1500);
    },
    [touchActivity]
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
    };
  }, []);

  const { data: tasks = [], isLoading } = useQuery(trpc.tasks.listIncomplete.queryOptions());
  const { data: triageTasks = [] } = useQuery(trpc.tasks.listTriageCandidates.queryOptions());
  const { data: top3Slots = [] } = useQuery(trpc.tasks.listTop3Slots.queryOptions());

  const triageIds = useMemo(() => new Set(triageTasks.map((t) => t.id)), [triageTasks]);

  const tasksExcludingTriage = useMemo(
    () => tasks.filter((t) => !triageIds.has(t.id)),
    [tasks, triageIds]
  );

  const partitioned = partitionPlanTasks(tasksExcludingTriage, new Date());

  const triggerRdmPick = useCallback(() => {
    const pick = pickRdmTask(partitioned.today, { lastWasLarge: lastWasLargeRef.current });
    if (!pick) return;

    lastWasLargeRef.current = pick.isTop3;

    const params = new URLSearchParams({ taskId: pick.id });
    router.push(`/plan/focus?${params.toString()}`);
  }, [partitioned.today, router]);

  const toRow = (task: (typeof tasks)[number]): PlanTaskRow => ({
    id: task.id,
    title: task.title,
    priority: task.priority,
    projectId: task.projectId,
    projectSlug: task.projectSlug,
    projectName: task.projectName,
    isTop3: task.isTop3,
  });

  const triageRows = useMemo(
    () =>
      triageTasks.map((t) => ({
        id: t.id,
        title: t.title,
        projectSlug: t.projectSlug,
        projectName: t.projectName,
      })),
    [triageTasks]
  );

  const exitTriageKeyboardMode = useCallback(() => {
    setTriageKeyboardActive(false);
  }, []);

  useEffect(() => {
    if (triageFocusedIndex >= triageRows.length && triageRows.length > 0) {
      setTriageFocusedIndex(triageRows.length - 1);
    }
  }, [triageFocusedIndex, triageRows.length]);

  useEffect(() => {
    if (triageRows.length === 0) {
      exitTriageKeyboardMode();
    }
  }, [triageRows.length, exitTriageKeyboardMode]);

  useEffect(() => {
    if (!triageKeyboardActive) return;

    const onFocusIn = (e: FocusEvent) => {
      const target = e.target;
      if (!isInTriageStrip(target)) {
        exitTriageKeyboardMode();
      }
    };

    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, [triageKeyboardActive, exitTriageKeyboardMode]);

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

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [triggerRdmPick]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (triageRows.length === 0) return;

      const inComposer = isQuickInputTarget(e.target);

      if (e.key === "Tab" && inComposer && !e.shiftKey) {
        e.preventDefault();
        setTriageKeyboardActive(true);
        triageRef.current?.focusFirst();
        return;
      }

      if (e.key === "Escape" && triageKeyboardActive) {
        e.preventDefault();
        exitTriageKeyboardMode();
        quickInputRef.current?.focus();
        return;
      }

      if (isEditableTarget(e.target)) return;

      if (!triageKeyboardActive) return;

      if (!isInTriageStrip(document.activeElement)) return;

      const triageActions: Record<string, TriageAction> = {
        "1": "today",
        "2": "tomorrow",
        "3": "later",
        "4": "drop",
      };

      if (e.key in triageActions) {
        e.preventDefault();
        triageRef.current?.applyAction(triageActions[e.key]!);
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const next = Math.max(0, (triageRef.current?.getFocusedIndex() ?? 0) - 1);
        triageRef.current?.focusIndex(next);
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        const count = triageRef.current?.getTaskCount() ?? 0;
        const next = Math.min(count - 1, (triageRef.current?.getFocusedIndex() ?? 0) + 1);
        triageRef.current?.focusIndex(next);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [triageKeyboardActive, triageRows.length, exitTriageKeyboardMode]);

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
      <div className="mb-3 flex items-center gap-2 px-2">
        <button
          type="button"
          onClick={triggerRdmPick}
          disabled={partitioned.today.length === 0}
          className="glass-pill inline-flex items-center gap-2 px-3 py-1.5 text-sm text-kash-ink-muted transition hover:text-kash-ink disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Decide next task (RDM)"
          title="Decide next task (⌘D)"
        >
          Decide
          <span className="font-mono text-xs text-kash-ink-muted" aria-hidden>
            ⌘D
          </span>
        </button>
      </div>
      <QuickInput ref={quickInputRef} onTaskCreated={triggerPulse} />
      <TriageStrip
        ref={triageRef}
        tasks={triageRows}
        focusedIndex={triageFocusedIndex}
        onFocusedIndexChange={(index) => {
          setTriageFocusedIndex(index);
          setTriageKeyboardActive(true);
        }}
        onDelete={pushDelete}
      />
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

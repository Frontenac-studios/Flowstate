"use client";

import { useDroppable } from "@dnd-kit/core";
import { useEffect, useRef, useState } from "react";

import { ColoredEmptyInvitation } from "@/components/kash/ui/ColoredEmptyInvitation";
import type { TaskSnapshot } from "@/hooks/useSessionUndo";

import { CompletedSection, type CompletedTaskRow } from "./CompletedSection";
import type { PlanTaskRow } from "./TaskRow";
import { TaskRow } from "./TaskRow";

type Props = {
  pulse: boolean;
  tasks: PlanTaskRow[];
  completions: CompletedTaskRow[];
  isLoading: boolean;
  selectedTaskId?: string | null;
  onSelectTask?: (taskId: string) => void;
  onActivateTask?: (taskId: string) => void;
  onComplete: (taskId: string, previousCompletedAt: Date | null) => void;
  onUncomplete?: (taskId: string) => void;
  onDelete: (snapshot: TaskSnapshot) => void;
  onPin?: (taskId: string, sourceEl: HTMLElement) => void;
};

/**
 * AN-T2: tracks which Today rows should play the arrival slide-in — staggered
 * on first load, single-row when a new task lands after capture or bucket move.
 */
function useTodayRowArrival(tasks: PlanTaskRow[], isLoading: boolean): Map<string, number> {
  const knownIdsRef = useRef<Set<string> | null>(null);
  const [arriveMap, setArriveMap] = useState<Map<string, number>>(() => new Map());

  useEffect(() => {
    if (isLoading) return;

    const ids = tasks.map((t) => t.id);

    if (knownIdsRef.current === null) {
      knownIdsRef.current = new Set(ids);
      const initial = new Map<string, number>();
      ids.forEach((id, index) => initial.set(id, index));
      setArriveMap(initial);
      return;
    }

    const newIds = ids.filter((id) => !knownIdsRef.current!.has(id));
    for (const id of ids) knownIdsRef.current!.add(id);

    if (newIds.length === 0) return;

    setArriveMap((prev) => {
      const next = new Map(prev);
      for (const id of newIds) next.set(id, 0);
      return next;
    });
  }, [tasks, isLoading]);

  return arriveMap;
}

export function TodayList({
  pulse,
  tasks,
  completions,
  isLoading,
  selectedTaskId,
  onSelectTask,
  onActivateTask,
  onComplete,
  onUncomplete,
  onDelete,
  onPin,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: "bucket:today" });
  const arriveMap = useTodayRowArrival(tasks, isLoading);

  return (
    <section
      ref={setNodeRef}
      className={`mt-section ${
        pulse ? "kash-section-pulse rounded-[var(--radius-card)]" : ""
      } ${isOver ? "kash-section-drop-target rounded-[var(--radius-card)]" : ""}`}
      aria-labelledby="today-heading"
    >
      <h2
        id="today-heading"
        className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-muted"
      >
        Today
        {tasks.length > 0 ? (
          <span className="ml-2 font-normal normal-case text-ink-muted">({tasks.length})</span>
        ) : null}
      </h2>

      {isLoading ? (
        <p className="rounded-card border border-subtle bg-surface px-4 py-8 text-center text-sm text-ink-muted">
          Loading…
        </p>
      ) : tasks.length === 0 ? (
        <ColoredEmptyInvitation
          title="Start your first task"
          hint="Capture something above — property chips appear as you type."
        />
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              selected={selectedTaskId === task.id}
              onSelect={onSelectTask}
              onActivate={onActivateTask}
              onComplete={onComplete}
              onDelete={onDelete}
              onPin={onPin}
              canPin={onPin != null}
              arriveIndex={arriveMap.get(task.id)}
            />
          ))}
        </ul>
      )}

      <CompletedSection completions={completions} onUncomplete={onUncomplete} />
    </section>
  );
}

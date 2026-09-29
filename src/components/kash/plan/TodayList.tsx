"use client";

import { useDroppable } from "@dnd-kit/core";
import { useEffect, useMemo, useRef, useState } from "react";

import { ColoredEmptyInvitation } from "@/components/kash/ui/ColoredEmptyInvitation";
import { QueryErrorNotice } from "@/components/kash/ui/QueryErrorNotice";
import { useLocalCalendarDate } from "@/hooks/useLocalCalendarDate";
import type { TaskSnapshot } from "@/hooks/useSessionUndo";
import { applyLens } from "@/lib/tasks/lens-apply";
import { groupTodayTasks } from "@/lib/today/group-today-tasks";

import { CompletedSection, type CompletedTaskRow } from "./CompletedSection";
import { useLens } from "./LensProvider";
import type { PlanTaskRow } from "./TaskRow";
import { TaskRow } from "./TaskRow";

type Props = {
  pulse: boolean;
  tasks: PlanTaskRow[];
  completions: CompletedTaskRow[];
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  selectedTaskId?: string | null;
  onSelectTask?: (taskId: string) => void;
  onActivateTask?: (taskId: string) => void;
  onComplete: (taskId: string, previousCompletedAt: Date | null) => void;
  onUncomplete?: (taskId: string) => void;
  onDelete: (snapshot: TaskSnapshot) => void;
  onPin?: (taskId: string, sourceEl: HTMLElement) => void;
};

type ListGroup = { key: string; label: string; color?: string; tasks: PlanTaskRow[] };

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
  isError,
  onRetry,
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
  const todayIso = useLocalCalendarDate();
  const lens = useLens();

  // Spec v5: cards for Overdue / Today / Anytime. A lens group-by replaces those
  // groups and lens / tag filters narrow the list — the lens bar stays useful.
  const groups = useMemo((): ListGroup[] => {
    if (lens) {
      const result = applyLens(tasks, lens.state, new Date(), lens.tagFilter);
      if (result.kind === "grouped") {
        return result.groups.map((g) => ({
          key: g.key,
          label: g.label,
          color: g.color,
          tasks: g.tasks,
        }));
      }
      return groupTodayTasks(result.tasks, todayIso);
    }
    return groupTodayTasks(tasks, todayIso);
  }, [lens, tasks, todayIso]);

  return (
    <section
      ref={setNodeRef}
      className={`${
        pulse ? "kash-section-pulse rounded-[var(--radius-card)]" : ""
      } ${isOver ? "kash-section-drop-target rounded-[var(--radius-card)]" : ""}`}
      aria-labelledby="today-heading"
    >
      <h2 id="today-heading" className="sr-only">
        Today&apos;s tasks
      </h2>

      {isLoading ? (
        <p className="rounded-card bg-surface px-4 py-8 text-center text-body text-ink-muted">
          Loading…
        </p>
      ) : isError ? (
        <QueryErrorNotice message="Today didn't load." onRetry={onRetry} />
      ) : tasks.length === 0 ? (
        <ColoredEmptyInvitation
          title="Nothing on today yet"
          hint="Capture something above — property chips appear as you type."
        />
      ) : groups.length === 0 ? (
        <p className="rounded-card bg-surface px-4 py-8 text-center text-body text-ink-muted">
          No tasks match the current filter.
        </p>
      ) : (
        <div className="flex flex-col gap-stack">
          {groups.map((group) => (
            <div key={group.key} className="flex flex-col gap-2">
              <h3
                className={`flex items-center gap-2 px-1 text-meta font-semibold ${
                  group.key === "overdue" ? "text-critical" : "text-ink"
                }`}
              >
                {group.color ? (
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-pill"
                    style={{ backgroundColor: group.color }}
                  />
                ) : null}
                {group.label} · {group.tasks.length}
              </h3>
              <ul className="divide-y divide-menu-divider rounded-card bg-surface px-3 py-2">
                {group.tasks.map((task) => (
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
                    weekDragLift
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <CompletedSection completions={completions} onUncomplete={onUncomplete} />
    </section>
  );
}

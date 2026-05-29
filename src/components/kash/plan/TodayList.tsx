"use client";

import { useDroppable } from "@dnd-kit/core";

import type { TaskSnapshot } from "@/hooks/useSessionUndo";

import type { PlanTaskRow } from "./TaskRow";
import { TaskRow } from "./TaskRow";

type Props = {
  pulse: boolean;
  tasks: PlanTaskRow[];
  isLoading: boolean;
  selectedTaskId?: string | null;
  onSelectTask?: (taskId: string) => void;
  onComplete: (taskId: string, previousCompletedAt: Date | null) => void;
  onDelete: (snapshot: TaskSnapshot) => void;
};

export function TodayList({
  pulse,
  tasks,
  isLoading,
  selectedTaskId,
  onSelectTask,
  onComplete,
  onDelete,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: "bucket:today" });

  return (
    <section
      ref={setNodeRef}
      className={`mt-6 ${
        pulse ? "kash-section-pulse rounded-[var(--kash-radius)]" : ""
      } ${isOver ? "kash-section-drop-target rounded-[var(--kash-radius)]" : ""}`}
      aria-labelledby="today-heading"
    >
      <h2
        id="today-heading"
        className="mb-3 text-sm font-medium uppercase tracking-wide text-kash-ink-muted"
      >
        Today
        {tasks.length > 0 ? (
          <span className="ml-2 font-normal normal-case text-kash-ink-muted">({tasks.length})</span>
        ) : null}
      </h2>

      {isLoading ? (
        <p className="glass-panel px-4 py-8 text-center text-sm text-kash-ink-muted">Loading…</p>
      ) : tasks.length === 0 ? (
        <div className="glass-panel flex flex-col items-center gap-2 px-4 py-10 text-center">
          <p className="text-sm text-kash-ink">Nothing on deck yet.</p>
          <p className="text-xs text-kash-ink-muted">
            Capture something above, or{" "}
            <span className="text-kash-accent">ask Claude what to focus on</span>.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              selected={selectedTaskId === task.id}
              onSelect={onSelectTask}
              onComplete={onComplete}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

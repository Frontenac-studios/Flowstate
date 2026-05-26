"use client";

import { useDroppable } from "@dnd-kit/core";

import type { TaskSnapshot } from "@/hooks/useSessionUndo";

import type { PlanTaskRow } from "./TaskRow";
import { TaskRow } from "./TaskRow";

type Props = {
  pulse: boolean;
  tasks: PlanTaskRow[];
  isLoading: boolean;
  onComplete: (taskId: string, previousCompletedAt: Date | null) => void;
  onDelete: (snapshot: TaskSnapshot) => void;
};

export function TodayList({ pulse, tasks, isLoading, onComplete, onDelete }: Props) {
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
        <p className="glass-panel-opaque px-4 py-6 text-center text-sm text-kash-ink-muted">
          Loading…
        </p>
      ) : tasks.length === 0 ? (
        <p className="glass-panel-opaque px-4 py-6 text-center text-kash-ink-muted">
          Capture something, or ask Claude what&apos;s on deck.
        </p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} onComplete={onComplete} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </section>
  );
}

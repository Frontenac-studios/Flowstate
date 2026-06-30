"use client";

import { useDroppable } from "@dnd-kit/core";

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
  onDelete: (snapshot: TaskSnapshot) => void;
  onPin?: (taskId: string, sourceEl: HTMLElement) => void;
};

export function TodayList({
  pulse,
  tasks,
  completions,
  isLoading,
  selectedTaskId,
  onSelectTask,
  onActivateTask,
  onComplete,
  onDelete,
  onPin,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: "bucket:today" });

  return (
    <section
      ref={setNodeRef}
      className={`mt-6 ${
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
        <div className="flex flex-col items-center gap-2 rounded-card border border-subtle bg-surface px-4 py-10 text-center">
          <p className="text-sm text-ink">Nothing on deck yet.</p>
          <p className="text-xs text-ink-muted">
            Capture something above, or{" "}
            <span className="text-accent">ask Claude what to focus on</span>.
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
              onActivate={onActivateTask}
              onComplete={onComplete}
              onDelete={onDelete}
              onPin={onPin}
              canPin={onPin != null}
            />
          ))}
        </ul>
      )}

      <CompletedSection completions={completions} />
    </section>
  );
}

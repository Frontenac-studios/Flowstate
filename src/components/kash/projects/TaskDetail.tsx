"use client";

import { useEffect, useState } from "react";

import type { ProjectTask } from "./types";

type Props = {
  task: ProjectTask;
  onUpdate: (patch: { title?: string; priority?: number }) => void;
  onToggleComplete: () => void;
  onRequestDelete: () => void;
  pending: boolean;
};

const PRIORITIES = [0, 1, 2, 3];

export default function TaskDetail({
  task,
  onUpdate,
  onToggleComplete,
  onRequestDelete,
  pending,
}: Props) {
  const completed = task.completedAt !== null;
  const [title, setTitle] = useState(task.title);

  useEffect(() => {
    setTitle(task.title);
  }, [task.id, task.title]);

  const commitTitle = () => {
    const trimmed = title.trim();
    if (!trimmed || trimmed === task.title) {
      setTitle(task.title);
      return;
    }
    onUpdate({ title: trimmed });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-kash-ink-muted">
          Task
        </span>
        <input
          className="glass-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          maxLength={500}
          aria-label="Task title"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-kash-ink">
        <input type="checkbox" checked={completed} onChange={onToggleComplete} />
        {completed ? "Completed" : "Mark complete"}
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-kash-ink">Priority</span>
        <div className="glass-pill flex w-fit text-sm" role="group" aria-label="Priority">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onUpdate({ priority: p })}
              aria-pressed={task.priority === p}
              className={`rounded-full px-3 py-1 transition ${
                task.priority === p
                  ? "bg-kash-accent text-white"
                  : "text-kash-ink-muted hover:text-kash-ink"
              }`}
            >
              {p === 0 ? "None" : "!".repeat(p)}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onRequestDelete}
        disabled={pending}
        className="self-start text-sm text-[#b42318] transition hover:underline disabled:opacity-50"
      >
        Delete task
      </button>
    </div>
  );
}

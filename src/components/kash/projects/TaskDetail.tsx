"use client";

import { useEffect, useState } from "react";

import { getTaskTitleError } from "@/lib/taskValidation";

import type { ProjectTask } from "./types";

type Props = {
  task: ProjectTask;
  onUpdate: (patch: { title?: string; priority?: number }) => void;
  onToggleComplete: () => void;
  onRequestDelete: () => void;
  pending: boolean;
  /** Set when the parent's save mutation failed, so the editor can surface it. */
  saveError?: string | null;
};

const PRIORITIES = [0, 1, 2, 3];

export default function TaskDetail({
  task,
  onUpdate,
  onToggleComplete,
  onRequestDelete,
  pending,
  saveError = null,
}: Props) {
  const completed = task.completedAt !== null;
  const [title, setTitle] = useState(task.title);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(task.title);
    setValidationError(null);
  }, [task.id, task.title]);

  const commitTitle = () => {
    const trimmed = title.trim();
    if (trimmed === task.title) {
      setTitle(task.title);
      setValidationError(null);
      return;
    }
    const titleError = getTaskTitleError(title);
    if (titleError) {
      setValidationError(titleError);
      return;
    }
    setValidationError(null);
    onUpdate({ title: trimmed });
  };

  const titleError = validationError ?? saveError;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-kash-ink-muted">
          Task
        </span>
        <textarea
          className="glass-input glass-textarea w-full break-words"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          rows={1}
          maxLength={500}
          aria-label="Task title"
          aria-invalid={titleError != null}
        />
        {titleError ? (
          <p className="text-sm text-red-600" role="alert">
            {titleError}
          </p>
        ) : null}
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

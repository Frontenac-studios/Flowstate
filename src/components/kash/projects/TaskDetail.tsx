"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { PROJECT_CATEGORIES, type ProjectCategory, categoryColor } from "@/lib/projects/categories";
import { defaultCategoryLabel } from "@/lib/projects/category-settings";
import { PRIORITY_LEVELS, priorityMeta } from "@/lib/tasks/priority";
import { getTaskTitleError } from "@/lib/taskValidation";
import { useTRPC } from "@/trpc/client";

import type { ProjectTask } from "./types";

type Props = {
  task: ProjectTask;
  onUpdate: (patch: { title?: string; priority?: number; category?: ProjectCategory }) => void;
  onToggleComplete: () => void;
  onRequestDelete: () => void;
  pending: boolean;
  /** Set when the parent's save mutation failed, so the editor can surface it. */
  saveError?: string | null;
};

export default function TaskDetail({
  task,
  onUpdate,
  onToggleComplete,
  onRequestDelete,
  pending,
  saveError = null,
}: Props) {
  const trpc = useTRPC();
  const completed = task.completedAt !== null;
  const [title, setTitle] = useState(task.title);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Effective labels + order come from category-settings; fall back to seed labels in
  // declared order until the query resolves (Q5 edit surface lives only here).
  const { data: categorySettings } = useQuery(trpc.categorySettings.get.queryOptions());
  const categoryOptions =
    categorySettings ??
    PROJECT_CATEGORIES.map((category, sortOrder) => ({
      category,
      label: defaultCategoryLabel(category),
      labelOverride: null,
      sortOrder,
    }));

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
          {PRIORITY_LEVELS.map((p) => {
            const meta = priorityMeta(p);
            const selected = task.priority === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onUpdate({ priority: p })}
                aria-pressed={selected}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition ${
                  selected ? "bg-kash-accent text-white" : "text-kash-ink-muted hover:text-kash-ink"
                }`}
              >
                {Array.from({ length: meta.dots }, (_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full ${selected ? "bg-white" : meta.dotClass}`}
                  />
                ))}
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="task-detail-category" className="text-sm font-medium text-kash-ink">
          Category
        </label>
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-4 w-4 shrink-0 rounded-full"
            style={{
              // Unresolved (1.4d) renders as a neutral marker, never the placeholder's color.
              backgroundColor: task.categoryUnresolved
                ? "transparent"
                : categoryColor(task.category),
              boxShadow: task.categoryUnresolved
                ? "inset 0 0 0 1.5px var(--kash-ink-muted)"
                : undefined,
            }}
          />
          <select
            id="task-detail-category"
            className="glass-input"
            value={task.category}
            onChange={(e) => onUpdate({ category: e.target.value as ProjectCategory })}
          >
            {categoryOptions.map((opt) => (
              <option key={opt.category} value={opt.category}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {task.categoryUnresolved ? (
          <p className="text-xs text-kash-ink-muted">Auto-filed — pick a category to confirm.</p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onRequestDelete}
        disabled={pending}
        className="self-start text-sm text-critical transition hover:underline disabled:opacity-50"
      >
        Delete task
      </button>
    </div>
  );
}

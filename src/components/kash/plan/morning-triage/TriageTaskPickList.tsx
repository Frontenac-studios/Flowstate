"use client";

import { useDraggable } from "@dnd-kit/core";
import { useState } from "react";

import { TaskDragHandle } from "@/components/kash/TaskDragHandle";
import Tooltip from "@/components/kash/ui/Tooltip";
import type { ProjectCategory } from "@/lib/projects/categories";
import { categoryTextVar } from "@/lib/projects/category-tokens";
import { TRIAGE_TASK_PREFIX } from "@/lib/morning-handoff/triage-drag";
import { cn } from "@/lib/cn";

import { triageCategoryRowTint } from "./triage-pick-styles";

export type TriagePickTask = {
  id: string;
  title: string;
  projectName?: string | null;
  category?: ProjectCategory | null;
};

type RowProps = {
  task: TriagePickTask;
  completing: boolean;
  onComplete?: (id: string) => void;
  disabled: boolean;
};

function TriagePickRow({ task, completing, onComplete, disabled }: RowProps) {
  const { setNodeRef, setActivatorNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `${TRIAGE_TASK_PREFIX}${task.id}`,
    disabled: disabled || completing,
  });
  const { tabIndex, ...dragAttributes } = attributes;
  void tabIndex;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group flex items-start gap-2 border border-subtle bg-surface px-2 py-1.5",
        task.category != null ? "rounded-r-row" : "rounded-row",
        disabled && "opacity-60",
        isDragging && "opacity-60",
        completing &&
          "translate-x-6 opacity-0 transition-[transform,opacity] duration-medium ease-exit motion-reduce:translate-x-0 motion-reduce:duration-short"
      )}
      style={triageCategoryRowTint(task.category)}
    >
      <TaskDragHandle
        ref={setActivatorNodeRef}
        listeners={listeners}
        attributes={dragAttributes}
        className="mt-0.5"
      />
      <span className="min-w-0 flex-1 break-words text-body text-ink">
        {task.title}
        {task.projectName ? (
          <span
            className="text-caption text-ink-muted"
            style={task.category != null ? { color: categoryTextVar(task.category) } : undefined}
          >
            {" "}
            · {task.projectName}
          </span>
        ) : null}
      </span>
      {onComplete ? (
        <Tooltip content="Mark completed">
          <button
            type="button"
            aria-label={`Mark ${task.title} completed`}
            disabled={disabled || completing}
            onClick={() => onComplete(task.id)}
            className="shrink-0 px-0.5 text-body leading-none text-ink-muted opacity-0 transition hover:text-ink focus-visible:opacity-100 disabled:cursor-not-allowed group-hover:opacity-100"
          >
            ✓
          </button>
        </Tooltip>
      ) : null}
    </div>
  );
}

type Props = {
  tasks: TriagePickTask[];
  /** Marks the task completed immediately (bare-check hover affordance). */
  onComplete?: (id: string) => void;
  disabled?: boolean;
};

export function TriageTaskPickList({ tasks, onComplete, disabled = false }: Props) {
  const [completingIds, setCompletingIds] = useState<Set<string>>(() => new Set());

  if (tasks.length === 0) return null;

  const handleComplete = (id: string) => {
    if (!onComplete || completingIds.has(id)) return;
    setCompletingIds((prev) => new Set(prev).add(id));
    onComplete(id);
  };

  return (
    <div className="space-y-2">
      <ul className="space-y-1" aria-label="Tasks to review">
        {tasks.map((task) => (
          <li key={task.id}>
            <TriagePickRow
              task={task}
              completing={completingIds.has(task.id)}
              onComplete={onComplete ? handleComplete : undefined}
              disabled={disabled}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

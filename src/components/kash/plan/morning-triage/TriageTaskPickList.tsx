"use client";

import { useState } from "react";

import Tooltip from "@/components/kash/ui/Tooltip";
import type { ProjectCategory } from "@/lib/projects/categories";
import { categoryTextVar } from "@/lib/projects/category-tokens";
import { cn } from "@/lib/cn";

import { triageCategoryRowTint } from "./triage-pick-styles";

export type TriagePickTask = {
  id: string;
  title: string;
  projectName?: string | null;
  category?: ProjectCategory | null;
};

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
        {tasks.map((task) => {
          const completing = completingIds.has(task.id);

          return (
            <li key={task.id}>
              <div
                className={cn(
                  "group flex items-start gap-2 border border-subtle bg-surface px-2 py-1.5",
                  task.category != null ? "rounded-r-row" : "rounded-row",
                  disabled && "opacity-60",
                  completing &&
                    "translate-x-6 opacity-0 transition-[transform,opacity] duration-medium ease-exit motion-reduce:translate-x-0 motion-reduce:duration-short"
                )}
                style={triageCategoryRowTint(task.category)}
              >
                <span className="min-w-0 flex-1 break-words text-body text-ink">
                  {task.title}
                  {task.projectName ? (
                    <span
                      className="text-caption text-ink-muted"
                      style={
                        task.category != null
                          ? { color: categoryTextVar(task.category) }
                          : undefined
                      }
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
                      onClick={() => handleComplete(task.id)}
                      className="shrink-0 px-0.5 text-body leading-none text-ink-muted opacity-0 transition hover:text-ink focus-visible:opacity-100 disabled:cursor-not-allowed group-hover:opacity-100"
                    >
                      ✓
                    </button>
                  </Tooltip>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

"use client";

import Checkbox from "@/components/kash/ui/Checkbox";
import type { ProjectCategory } from "@/lib/projects/categories";
import { categoryTextVar } from "@/lib/projects/category-tokens";
import { cn } from "@/lib/cn";

import { triageCategoryRowTint } from "./triage-pick-styles";

export type TriagePickTask = {
  id: string;
  title: string;
  meta?: string;
  category?: ProjectCategory | null;
};

type Props = {
  tasks: TriagePickTask[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  disabled?: boolean;
};

export function TriageTaskPickList({ tasks, selectedIds, onToggle, disabled = false }: Props) {
  if (tasks.length === 0) return null;

  return (
    <div className="space-y-2">
      <ul className="space-y-1" aria-label="Tasks to review">
        {tasks.map((task) => {
          const checked = selectedIds.has(task.id);
          const inputId = `triage-pick-${task.id}`;

          return (
            <li key={task.id}>
              <label
                htmlFor={inputId}
                className={cn(
                  "flex cursor-pointer items-start gap-2 border border-subtle bg-surface px-2 py-1.5 transition",
                  task.category != null ? "rounded-r-row" : "rounded-row",
                  disabled && "cursor-not-allowed opacity-60"
                )}
                style={triageCategoryRowTint(task.category)}
              >
                <Checkbox
                  id={inputId}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onToggle(task.id)}
                  className="mt-0.5"
                />
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-body text-ink">{task.title}</span>
                  {task.meta ? (
                    <span
                      className="mt-0.5 block text-caption text-ink-muted"
                      style={
                        task.category != null
                          ? { color: categoryTextVar(task.category) }
                          : undefined
                      }
                    >
                      {task.meta}
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

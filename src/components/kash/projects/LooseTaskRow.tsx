"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import Select from "@/components/kash/ui/Select";
import {
  categoryFillVar,
  categorySeedLabel,
  categorySolidVar,
  categoryTextVar,
} from "@/lib/projects/category-tokens";
import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";
import { useTRPC } from "@/trpc/client";

export type LooseTaskListItem = {
  id: string;
  title: string;
  category: ProjectCategory;
  categoryUnresolved: boolean;
  priority: number;
  scheduledDate: string | null;
  updatedAt: string;
};

type ProjectOption = {
  id: string;
  name: string;
  category: ProjectCategory;
};

type Props = {
  task: LooseTaskListItem;
  projects: ProjectOption[];
};

export default function LooseTaskRow({ task, projects }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: trpc.projects.listLooseTasks.queryKey() });
    void queryClient.invalidateQueries({
      queryKey: trpc.projects.listLooseTaskCountsByCategory.queryKey(),
    });
    void queryClient.invalidateQueries({ queryKey: trpc.projects.list.queryKey() });
  };

  const updateMutation = useMutation(
    trpc.tasks.update.mutationOptions({
      onSuccess: invalidate,
    })
  );

  const assignableProjects = useMemo(
    () => projects.filter((project) => project.category === task.category),
    [projects, task.category]
  );

  const stripe = categorySolidVar(task.category);
  const pending = updateMutation.isPending;

  return (
    <div className="flex flex-col gap-3 rounded-card border border-subtle bg-surface p-4 shadow-surface sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className="mt-1.5 h-3.5 shrink-0 rounded-full"
          style={{ width: "var(--stripe-width)", backgroundColor: stripe }}
          aria-hidden
        />
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{task.title}</p>
          <p className="mt-0.5 text-caption text-ink-muted">
            {task.categoryUnresolved ? "No category yet" : categorySeedLabel(task.category)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <fieldset className="flex flex-wrap gap-1" aria-label="Change category">
          {PROJECT_CATEGORIES.map((value) => {
            const selected = task.category === value;
            return (
              <button
                key={value}
                type="button"
                disabled={pending || selected}
                onClick={() => updateMutation.mutate({ id: task.id, category: value })}
                aria-pressed={selected}
                className="rounded-chip border px-2 py-0.5 text-caption font-medium transition disabled:opacity-60"
                style={
                  selected
                    ? {
                        backgroundColor: categoryFillVar(value),
                        color: categoryTextVar(value),
                        borderColor: "transparent",
                      }
                    : { borderColor: "var(--border)", color: "var(--ink-muted)" }
                }
              >
                {categorySeedLabel(value)}
              </button>
            );
          })}
        </fieldset>

        <Select
          aria-label={`Assign ${task.title} to a project`}
          value=""
          disabled={pending || assignableProjects.length === 0}
          onChange={(event) => {
            const projectId = event.target.value;
            if (!projectId) return;
            updateMutation.mutate({ id: task.id, projectId });
            event.target.value = "";
          }}
          className="max-w-48 text-caption"
        >
          <option value="">
            {assignableProjects.length === 0 ? "No matching projects" : "Assign to project…"}
          </option>
          {assignableProjects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import Select from "@/components/kash/ui/Select";
import SwipeActionRail, { swipeRevealWidth } from "@/components/kash/SwipeActionRail";
import TaskContextMenu from "@/components/kash/TaskContextMenu";
import { Check, Pencil, Trash2 } from "@/components/kash/ui/icon";
import { useCompletionToast } from "@/hooks/useCompletionToast";
import { useRowSwipe } from "@/hooks/useRowSwipe";
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
  completedAt: string | null;
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

const REVEAL_WIDTH_PX = swipeRevealWidth(2);

export default function LooseTaskRow({ task, projects }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const showCompletionToast = useCompletionToast();

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
  const completeMutation = useMutation(
    trpc.tasks.complete.mutationOptions({
      onSuccess: () => {
        showCompletionToast(task);
        invalidate();
      },
    })
  );
  const uncompleteMutation = useMutation(
    trpc.tasks.uncomplete.mutationOptions({ onSuccess: invalidate })
  );
  const deleteMutation = useMutation(trpc.tasks.delete.mutationOptions({ onSuccess: invalidate }));

  const completed = task.completedAt !== null;
  // Optimistic display: reflect an in-flight toggle before the refetch lands, so
  // the swipe/menu completion reads instantly (D1/D3).
  const shownCompleted = completeMutation.isPending
    ? true
    : uncompleteMutation.isPending
      ? false
      : completed;

  const toggleComplete = () => {
    if (shownCompleted) uncompleteMutation.mutate({ id: task.id });
    else completeMutation.mutate({ id: task.id });
  };

  const handleDelete = () => deleteMutation.mutate({ id: task.id });

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const { revealOffset, flingOffset, hide, containerRef } = useRowSwipe({
    revealWidth: REVEAL_WIDTH_PX,
    onSwipeComplete: toggleComplete,
  });
  const railOpen = revealOffset >= REVEAL_WIDTH_PX / 2;

  const startEdit = () => {
    hide();
    setEditTitle(task.title);
    setEditing(true);
  };
  const saveTitle = () => {
    const trimmed = editTitle.trim();
    setEditing(false);
    if (!trimmed || trimmed === task.title) {
      setEditTitle(task.title);
      return;
    }
    updateMutation.mutate({ id: task.id, title: trimmed });
  };

  const assignableProjects = useMemo(
    () => projects.filter((project) => project.category === task.category),
    [projects, task.category]
  );

  const stripe = categorySolidVar(task.category);
  const pending = updateMutation.isPending;

  return (
    <div
      ref={containerRef}
      className="relative touch-pan-y overflow-hidden rounded-card border border-border bg-surface shadow-surface"
    >
      {/* Complete-tone hint revealed under the row as it flings right (D1). */}
      {flingOffset > 0 ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-0 flex items-center pl-4"
          style={{
            width: flingOffset,
            backgroundColor: "color-mix(in srgb, var(--action-complete) 14%, transparent)",
          }}
        >
          <Check size={18} className="text-[var(--action-complete)]" aria-hidden />
        </div>
      ) : null}
      <div
        className="relative flex items-stretch transition-transform duration-short ease-move motion-reduce:transition-none"
        style={flingOffset > 0 ? { transform: `translateX(${flingOffset}px)` } : undefined}
      >
        <div
          className="flex min-w-0 flex-1 flex-col gap-3 bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
          onContextMenu={(e) => {
            e.preventDefault();
            hide();
            setContextMenu({ x: e.clientX, y: e.clientY });
          }}
        >
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="mt-1.5 h-3.5 shrink-0 rounded-full"
              style={{ width: "var(--stripe-width)", backgroundColor: stripe }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              {editing ? (
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      saveTitle();
                    }
                    if (e.key === "Escape") {
                      setEditing(false);
                      setEditTitle(task.title);
                    }
                  }}
                  onBlur={saveTitle}
                  aria-label={`Edit ${task.title}`}
                  className="kash-focus-visible w-full rounded-control border border-border bg-surface px-2 py-1 text-sm font-medium text-ink outline-none transition-shadow"
                />
              ) : (
                <p
                  className={`truncate font-medium ${
                    shownCompleted ? "text-ink-muted line-through" : "text-ink"
                  }`}
                >
                  {task.title}
                </p>
              )}
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

        <SwipeActionRail
          open={railOpen}
          actions={[
            {
              key: "edit",
              label: "Edit",
              icon: Pencil,
              tone: "edit",
              onClick: (e) => {
                e.stopPropagation();
                startEdit();
              },
            },
            {
              key: "delete",
              label: "Delete",
              icon: Trash2,
              tone: "danger",
              onClick: (e) => {
                e.stopPropagation();
                hide();
                handleDelete();
              },
            },
          ]}
        />
      </div>
      {contextMenu ? (
        <TaskContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          completed={shownCompleted}
          onComplete={toggleComplete}
          onEdit={startEdit}
          onDelete={handleDelete}
          onClose={() => setContextMenu(null)}
        />
      ) : null}
    </div>
  );
}

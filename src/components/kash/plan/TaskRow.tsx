"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import type { TaskSnapshot } from "@/hooks/useSessionUndo";
import { useTRPC } from "@/trpc/client";

import { TaskRowMenu } from "./TaskRowMenu";

export type PlanTaskRow = {
  id: string;
  title: string;
  priority: number;
  projectId: string | null;
  projectSlug: string | null;
  projectName: string | null;
  isTop3: boolean;
};

type Props = {
  task: PlanTaskRow;
  selected?: boolean;
  onSelect?: (taskId: string) => void;
  onComplete: (taskId: string, previousCompletedAt: Date | null) => void;
  onDelete: (snapshot: TaskSnapshot) => void;
};

function PriorityDots({ priority }: { priority: number }) {
  if (priority === 0) return <span className="w-6" aria-hidden />;

  return (
    <span className="text-kash-accent" aria-label={`Priority ${priority}`}>
      {"!".repeat(priority)}
    </span>
  );
}

export function TaskRow({ task, selected = false, onSelect, onComplete, onDelete }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const invalidatePlan = () => {
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listTop3Slots.queryKey() });
  };

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } =
    useDraggable({
      id: `task:${task.id}`,
      disabled: editing,
      data: { taskId: task.id },
    });

  const { tabIndex, ...dragAttributes } = attributes;
  void tabIndex;

  const completeMutation = useMutation(
    trpc.tasks.complete.mutationOptions({
      onSuccess: (data) => {
        onComplete(data.task.id, data.previousCompletedAt);
        invalidatePlan();
      },
    })
  );

  const updateMutation = useMutation(
    trpc.tasks.update.mutationOptions({
      onSuccess: () => {
        setEditing(false);
        invalidatePlan();
      },
    })
  );

  const deleteMutation = useMutation(
    trpc.tasks.delete.mutationOptions({
      onSuccess: (data) => {
        onDelete(data.snapshot);
        invalidatePlan();
      },
    })
  );

  const saveTitle = () => {
    const trimmed = editTitle.trim();
    if (!trimmed || trimmed === task.title) {
      setEditing(false);
      setEditTitle(task.title);
      return;
    }
    updateMutation.mutate({ id: task.id, title: trimmed });
  };

  return (
    <li
      ref={setNodeRef}
      className={`glass-panel-opaque flex min-h-kash-row cursor-pointer items-center gap-2 px-3 py-2 ${
        task.isTop3 ? "border-l-2 border-kash-accent" : ""
      } ${selected ? "ring-2 ring-[var(--kash-accent-soft)]" : ""} ${
        isDragging ? "opacity-60" : ""
      } ${isDragging ? "" : "transition-transform"}`}
      style={{ transform: CSS.Transform.toString(transform) }}
      onClick={() => onSelect?.(task.id)}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="cursor-grab text-kash-ink-muted"
        aria-label="Drag handle"
        {...listeners}
        {...dragAttributes}
        tabIndex={-1}
      >
        ⠿
      </button>

      {task.isTop3 ? (
        <span className="shrink-0 text-kash-accent" aria-label="Top 3">
          ★
        </span>
      ) : null}

      <input
        type="checkbox"
        className="h-4 w-4 rounded border border-white/60 accent-kash-accent"
        aria-label={`Complete ${task.title}`}
        checked={completeMutation.isPending}
        onClick={(e) => e.stopPropagation()}
        onChange={() => {
          if (completeMutation.isPending) return;
          completeMutation.mutate({ id: task.id });
        }}
      />

      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            type="text"
            className="glass-input w-full py-1 text-sm"
            value={editTitle}
            autoFocus
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
          />
        ) : (
          <span className="block truncate text-kash-ink">{task.title}</span>
        )}
      </div>

      {task.projectSlug && task.projectId ? (
        <Link
          href={`/projects/${task.projectId}`}
          className="glass-pill shrink-0 px-2 py-0.5 text-xs text-kash-ink-muted hover:text-kash-accent"
        >
          #{task.projectSlug}
        </Link>
      ) : null}

      <PriorityDots priority={task.priority} />

      <TaskRowMenu
        onEdit={() => {
          setEditTitle(task.title);
          setEditing(true);
        }}
        onDelete={() => deleteMutation.mutate({ id: task.id })}
      />
    </li>
  );
}

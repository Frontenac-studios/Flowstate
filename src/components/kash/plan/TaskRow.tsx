"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import type { TaskSnapshot } from "@/hooks/useSessionUndo";
import { useTRPC } from "@/trpc/client";

import { TaskRowMenu } from "./TaskRowMenu";

export type TodayTask = {
  id: string;
  title: string;
  priority: number;
  projectId: string | null;
  projectSlug: string | null;
  projectName: string | null;
  isTop3: boolean;
};

type Props = {
  task: TodayTask;
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

export function TaskRow({ task, onComplete, onDelete }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const invalidateToday = () => {
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listToday.queryKey() });
  };

  const completeMutation = useMutation(
    trpc.tasks.complete.mutationOptions({
      onSuccess: (data) => {
        onComplete(data.task.id, data.previousCompletedAt);
        invalidateToday();
      },
    })
  );

  const updateMutation = useMutation(
    trpc.tasks.update.mutationOptions({
      onSuccess: () => {
        setEditing(false);
        invalidateToday();
      },
    })
  );

  const deleteMutation = useMutation(
    trpc.tasks.delete.mutationOptions({
      onSuccess: (data) => {
        onDelete(data.snapshot);
        invalidateToday();
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
    <li className="glass-panel-opaque flex min-h-kash-row items-center gap-2 px-3 py-2">
      <button
        type="button"
        className="cursor-grab text-kash-ink-muted"
        aria-label="Drag handle"
        tabIndex={-1}
      >
        ⠿
      </button>

      <input
        type="checkbox"
        className="h-4 w-4 rounded border border-white/60 accent-kash-accent"
        aria-label={`Complete ${task.title}`}
        disabled={completeMutation.isPending}
        onChange={() => completeMutation.mutate({ id: task.id })}
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

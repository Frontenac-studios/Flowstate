"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import type { TaskSnapshot } from "@/hooks/useSessionUndo";
import { TaskDragHandle } from "@/components/kash/TaskDragHandle";
import { TaskPriorityIndicator } from "@/components/kash/TaskPriorityIndicator";
import { useTrackpadSwipeReveal } from "@/hooks/useTrackpadSwipeReveal";
import { formatRelativeDue } from "@/lib/dates/format-relative-due";
import {
  categoryLabel,
  PROJECT_CATEGORY_META,
  type ProjectCategory,
} from "@/lib/projects/categories";
import { projectPhaseColor } from "@/lib/projects/project-phase-color";
import { type RevealFlags } from "@/lib/tasks/lens";
import { getTaskTitleError } from "@/lib/taskValidation";
import { useTRPC } from "@/trpc/client";

import { useReveal } from "./LensProvider";

export type PlanTaskRow = {
  id: string;
  title: string;
  priority: number;
  projectId: string | null;
  projectSlug: string | null;
  projectName: string | null;
  isTop3: boolean;
  // Optional so list builders that don't yet select category still type-check;
  // surfaced under the category lens as the life-area stripe (1.4b) or neutral
  // marker (1.4d).
  category?: ProjectCategory | null;
  categoryUnresolved?: boolean;
  // Surfaced under the due lens as a relative label (VF-1).
  scheduledDate?: string | null;
};

const NEUTRAL_CATEGORY_STRIPE = "rgba(120,120,120,0.3)";

type Props = {
  task: PlanTaskRow;
  selected?: boolean;
  onSelect?: (taskId: string) => void;
  /** Double-click / activate — opens the task in focus mode. */
  onActivate?: (taskId: string) => void;
  onComplete: (taskId: string, previousCompletedAt: Date | null) => void;
  onDelete: (snapshot: TaskSnapshot) => void;
  onPin?: (taskId: string, sourceEl: HTMLElement) => void;
  canPin?: boolean;
  /** Surfaces that are already project-scoped pass false to never reveal project. */
  showProject?: boolean;
  /**
   * Explicit reveal override. Normally omitted — the row reads the active lens
   * from the surrounding `LensProvider` via `useReveal()` (VF-2).
   */
  reveal?: RevealFlags;
  /** Day-grouped surfaces (Today, This Week) suppress the due lens (VF5). */
  suppressDue?: boolean;
};

const ACTION_WIDTH_PX = 72;
const REVEAL_WIDTH_PX = ACTION_WIDTH_PX * 2;

export function TaskRow({
  task,
  selected = false,
  onSelect,
  onActivate,
  onComplete,
  onDelete,
  onPin,
  canPin = false,
  showProject = true,
  reveal,
  suppressDue = false,
}: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editError, setEditError] = useState<string | null>(null);
  const rowContentRef = useRef<HTMLDivElement>(null);
  const pinEnabled = canPin && !task.isTop3 && onPin != null;

  // Clean by default; indicators reveal per active lens (VF-2). The surrounding
  // LensProvider renders clean on the server / first paint, then hydrates from
  // storage — so no hydration mismatch. An explicit `reveal` prop overrides it.
  const lensReveal = useReveal();
  const activeReveal = reveal ?? lensReveal;

  // 1.4b/1.4d life-area stripe: category color when resolved, neutral marker when
  // unresolved. Lens-gated (VF-1) — the stripe is the category channel only.
  const resolvedCategory = task.category && !task.categoryUnresolved ? task.category : null;
  const stripeColor = resolvedCategory
    ? PROJECT_CATEGORY_META[resolvedCategory].color
    : NEUTRAL_CATEGORY_STRIPE;
  const stripeLabel = resolvedCategory ? categoryLabel(resolvedCategory) : "No category yet";

  const relativeDue =
    activeReveal.due && !suppressDue ? formatRelativeDue(task.scheduledDate) : null;
  const isOverdue = relativeDue?.emphasis === "danger";
  const dueEmphasisClass =
    relativeDue?.emphasis === "danger"
      ? "font-medium text-[var(--due-overdue)]"
      : relativeDue?.emphasis === "soon"
        ? "font-medium text-[var(--due-soon)]"
        : "text-[var(--due-future)]";
  const showProjectIndicator = Boolean(activeReveal.project && showProject && task.projectName);
  const { offset, hide, isOpen, isLeftOpen, isRightOpen, containerRef } = useTrackpadSwipeReveal({
    maxOffsetRight: REVEAL_WIDTH_PX,
    maxOffsetLeft: pinEnabled ? ACTION_WIDTH_PX : 0,
  });

  const invalidatePlan = () => {
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listTop3Slots.queryKey() });
  };

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } =
    useDraggable({
      id: `task:${task.id}`,
      disabled: editing || isOpen,
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
        setEditError(null);
        hide();
        invalidatePlan();
      },
      onError: () => setEditError("Couldn't save your change — please try again."),
    })
  );

  const deleteMutation = useMutation(
    trpc.tasks.delete.mutationOptions({
      onSuccess: (data) => {
        onDelete(data.snapshot);
        hide();
        invalidatePlan();
      },
    })
  );

  const saveTitle = () => {
    const trimmed = editTitle.trim();
    if (trimmed === task.title) {
      setEditing(false);
      setEditError(null);
      setEditTitle(task.title);
      return;
    }
    const titleError = getTaskTitleError(editTitle);
    if (titleError) {
      setEditError(titleError);
      return;
    }
    setEditError(null);
    updateMutation.mutate({ id: task.id, title: trimmed });
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditError(null);
    setEditTitle(task.title);
  };

  const startEdit = () => {
    hide();
    setEditTitle(task.title);
    setEditError(null);
    setEditing(true);
  };

  return (
    <li
      ref={setNodeRef}
      className={`relative overflow-hidden rounded-[var(--kash-radius)] ${
        isDragging ? "opacity-60" : ""
      } ${isDragging ? "" : "transition-transform"}`}
      style={{ transform: CSS.Transform.toString(transform) }}
    >
      <div ref={containerRef} className="relative">
        {pinEnabled ? (
          <div className="absolute inset-y-0 left-0 flex" aria-hidden={!isLeftOpen}>
            <button
              type="button"
              className="glass-panel-opaque flex w-[4.5rem] flex-col items-center justify-center gap-0.5 text-sm text-kash-accent"
              onClick={(e) => {
                e.stopPropagation();
                hide();
                if (rowContentRef.current) {
                  onPin(task.id, rowContentRef.current);
                }
              }}
            >
              <span aria-hidden>★</span>
              <span>Pin</span>
            </button>
          </div>
        ) : null}

        <div className="absolute inset-y-0 right-0 flex" aria-hidden={!isRightOpen}>
          <button
            type="button"
            className="glass-panel-opaque flex w-[4.5rem] items-center justify-center text-sm text-kash-ink"
            onClick={(e) => {
              e.stopPropagation();
              startEdit();
            }}
          >
            Edit
          </button>
          <button
            type="button"
            className="glass-panel-opaque flex w-[4.5rem] items-center justify-center text-sm text-kash-ink-muted"
            onClick={(e) => {
              e.stopPropagation();
              deleteMutation.mutate({ id: task.id });
            }}
          >
            Delete
          </button>
        </div>

        <div
          ref={rowContentRef}
          data-task-row={task.id}
          className={`glass-panel-opaque relative flex min-h-kash-row cursor-pointer items-start gap-2 px-3 py-kash-task-y transition-transform duration-150 ease-out ${
            task.isTop3 ? "border-l-2 border-kash-accent" : ""
          } ${selected ? "ring-2 ring-[var(--kash-accent-soft)]" : ""}`}
          style={{ transform: `translateX(${offset}px)` }}
          onClick={() => onSelect?.(task.id)}
          onDoubleClick={() => onActivate?.(task.id)}
        >
          <span
            className="mt-0.5 w-[3px] shrink-0 self-stretch rounded-full"
            style={{ backgroundColor: activeReveal.category ? stripeColor : "transparent" }}
            aria-label={activeReveal.category ? stripeLabel : undefined}
            title={activeReveal.category ? stripeLabel : undefined}
            aria-hidden={!activeReveal.category}
          />

          {task.isTop3 ? (
            <span className="shrink-0 text-kash-accent" aria-label="Top 3">
              ★
            </span>
          ) : null}

          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border border-white/60 accent-kash-accent"
            aria-label={`Complete ${task.title}`}
            disabled={completeMutation.isPending}
            onClick={(e) => e.stopPropagation()}
            onChange={() => completeMutation.mutate({ id: task.id })}
          />

          <div className="min-w-0 flex-1">
            {editing ? (
              <>
                <input
                  type="text"
                  className="glass-input w-full py-1 text-sm"
                  value={editTitle}
                  autoFocus
                  aria-invalid={editError != null}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      saveTitle();
                    }
                    if (e.key === "Escape") {
                      cancelEdit();
                    }
                  }}
                  onBlur={saveTitle}
                />
                {editError ? (
                  <p className="mt-1 text-sm text-red-600" role="alert">
                    {editError}
                  </p>
                ) : null}
              </>
            ) : (
              <span className={`block break-words text-kash-ink ${isOverdue ? "font-medium" : ""}`}>
                {task.title}
              </span>
            )}
          </div>

          {showProjectIndicator && task.projectId ? (
            <Link
              href={`/projects/${task.projectId}`}
              className="mt-0.5 flex max-w-[8rem] shrink-0 items-center gap-1.5 text-xs text-kash-ink-muted hover:text-kash-accent"
              onClick={(e) => e.stopPropagation()}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: projectPhaseColor(task.projectId) }}
                aria-hidden
              />
              <span className="truncate">{task.projectName}</span>
            </Link>
          ) : null}

          {relativeDue ? (
            <span className={`mt-0.5 shrink-0 self-start text-xs ${dueEmphasisClass}`}>
              {relativeDue.text}
            </span>
          ) : null}

          {activeReveal.priority ? (
            <TaskPriorityIndicator priority={task.priority} reserveSpace />
          ) : null}

          <TaskDragHandle
            ref={setActivatorNodeRef}
            listeners={listeners}
            attributes={dragAttributes}
          />
        </div>
      </div>
    </li>
  );
}

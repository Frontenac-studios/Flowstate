"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import SuggestedDateChip from "@/components/kash/plan/SuggestedDateChip";
import { TaskTagChips } from "@/components/kash/plan/TaskTagChips";
import { TaskDragHandle } from "@/components/kash/TaskDragHandle";
import { Lock, withKashIcon } from "@/components/kash/ui/icon";
import { TaskPriorityIndicator } from "@/components/kash/TaskPriorityIndicator";
import { useTrackpadSwipeReveal } from "@/hooks/useTrackpadSwipeReveal";

import { useProjectMutations } from "./useProjectMutations";
import type { ProjectTask } from "./types";

const LockIcon = withKashIcon(Lock);
const ACTION_WIDTH_PX = 72;
const REVEAL_WIDTH_PX = ACTION_WIDTH_PX * 2;

type Props = {
  projectId: string;
  task: ProjectTask;
  parentPhaseId: string | null;
  selected: boolean;
  focused: boolean;
  /** Focus / select the row without opening detail. */
  onSelect: () => void;
  /** Toggle inline detail (swipe Edit / keyboard). */
  onToggleDetail: () => void;
  onToggleComplete: () => void;
  /**
   * P6 post-create feedback: pulse class applied to the row's own `<li>` (rather
   * than wrapping it in another `<li>`, which would nest list items).
   */
  highlightClassName?: string;
};

export default function MillerTaskRow({
  projectId,
  task,
  parentPhaseId,
  selected,
  focused,
  onSelect,
  onToggleDetail,
  onToggleComplete,
  highlightClassName,
}: Props) {
  const m = useProjectMutations(projectId);
  const completed = task.completedAt !== null;
  const isBlocked = !completed && task.isBlocked === true;
  const blockerLabel = task.blockerTitle ?? "blocker";
  const showSuggestion =
    !completed &&
    task.bucketOverride === "later" &&
    task.scheduledDate === null &&
    task.suggestedScheduledDate != null;

  const { offset, hide, isRightOpen, containerRef } = useTrackpadSwipeReveal({
    maxOffsetRight: REVEAL_WIDTH_PX,
  });

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `task:${task.id}`,
    data: { taskId: task.id },
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `taskdrop:${task.id}`,
    data: { kind: "task", taskId: task.id, parentPhaseId },
  });

  const { tabIndex: _drop, ...dragAttributes } = attributes;
  void _drop;

  const setRefs = (el: HTMLLIElement | null) => {
    setDragRef(el);
    setDropRef(el);
  };

  return (
    <li
      ref={setRefs}
      data-miller-item
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`relative flex items-start gap-2 overflow-hidden rounded-card px-2 py-0.5 transition ${
        isBlocked ? "border border-dashed border-ink-faint" : ""
      } ${selected ? "bg-[var(--surface-selected)]" : "hover:bg-surface"} ${
        focused ? "ring-2 ring-inset ring-[var(--accent-soft)]" : ""
      } ${isDragging ? "opacity-50" : ""} ${
        isOver ? "border-t-2 border-ink" : "border-t-2 border-transparent"
      } ${highlightClassName ?? ""}`}
    >
      <div className="absolute inset-y-0 right-0 flex" aria-hidden={!isRightOpen}>
        <button
          type="button"
          className="flex w-[4.5rem] items-center justify-center rounded-card border border-subtle bg-surface text-sm text-ink"
          onClick={(e) => {
            e.stopPropagation();
            hide();
            onToggleDetail();
          }}
        >
          Edit
        </button>
        <button
          type="button"
          disabled={isBlocked}
          className={`flex w-[4.5rem] items-center justify-center rounded-card border border-subtle bg-surface text-sm text-ink-muted ${
            isBlocked ? "opacity-50" : ""
          }`}
          onClick={(e) => {
            e.stopPropagation();
            hide();
            onToggleComplete();
          }}
        >
          {completed ? "Undo" : "Complete"}
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative flex min-w-0 flex-1 items-start gap-2 bg-surface"
        style={{ transform: `translateX(${offset}px)` }}
      >
        <button
          type="button"
          onClick={onSelect}
          aria-expanded={selected}
          className={`min-w-0 flex-1 text-left text-sm focus:outline-none focus-visible:shadow-[inset_0_0_0_var(--focus-ring-width)_var(--focus-ring)] ${
            completed ? "text-ink-muted line-through" : "text-ink"
          }`}
        >
          {isBlocked ? (
            <p className="mb-0.5 flex items-center gap-1 text-caption text-ink-faint">
              <LockIcon size={12} className="shrink-0" aria-hidden />
              <span>Waiting on {blockerLabel}</span>
            </p>
          ) : null}
          <span className="line-clamp-4 break-words">{task.title}</span>
          {(task.tags?.length ?? 0) > 0 ? (
            <TaskTagChips tags={task.tags ?? []} className="mt-1" maxVisible={2} />
          ) : null}
          {showSuggestion ? (
            <SuggestedDateChip
              taskId={task.id}
              suggestedScheduledDate={task.suggestedScheduledDate!}
              onAccepted={() => m.invalidateAll()}
              className="mt-1 flex flex-wrap items-center gap-1.5"
            />
          ) : null}
        </button>
        <TaskPriorityIndicator priority={task.priority} />
        <TaskDragHandle listeners={listeners} attributes={dragAttributes} />
      </div>
    </li>
  );
}

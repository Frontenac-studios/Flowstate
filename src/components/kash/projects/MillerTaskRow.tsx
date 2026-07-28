"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import SuggestedDateChip from "@/components/kash/plan/SuggestedDateChip";
import { TaskTagChips } from "@/components/kash/plan/TaskTagChips";
import { TaskDragHandle } from "@/components/kash/TaskDragHandle";
import SwipeActionRail, { swipeRevealWidth } from "@/components/kash/SwipeActionRail";
import { Check, Lock, Pencil, Undo2, withKashIcon } from "@/components/kash/ui/icon";
import { TaskPriorityIndicator } from "@/components/kash/TaskPriorityIndicator";
import { useTrackpadSwipeReveal } from "@/hooks/useTrackpadSwipeReveal";

import { useProjectMutations } from "./useProjectMutations";
import type { ProjectTask } from "./types";

const LockIcon = withKashIcon(Lock);
const REVEAL_WIDTH_PX = swipeRevealWidth(2);

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

  const { rightOffset, hide, containerRef } = useTrackpadSwipeReveal({
    maxOffsetRight: REVEAL_WIDTH_PX,
  });

  /**
   * Snapped, not live. The rail squeezes the title column rather than sliding the row,
   * so following the gesture pixel-for-pixel would reflow the text on every wheel
   * event. Flipping once at the halfway mark matches where the hook snaps anyway.
   */
  const railOpen = rightOffset >= REVEAL_WIDTH_PX / 2;

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
      className={`relative flex shrink-0 items-start gap-2 overflow-hidden rounded-card transition ${
        isBlocked ? "border border-dashed border-ink-faint" : ""
      } ${selected ? "bg-[var(--surface-selected)]" : "hover:bg-surface"} ${
        focused ? "ring-2 ring-inset ring-[var(--accent-soft)]" : ""
      } ${isDragging ? "opacity-50" : ""} ${
        isOver ? "border-t-2 border-ink" : "border-t-2 border-transparent"
      } ${highlightClassName ?? ""}`}
    >
      {/*
        Padding lives here rather than on the <li> so the rail's `-my-0.5 -mr-2` can
        cancel it and bleed the caps out to the row's own rounded edge.
      */}
      <div
        ref={containerRef}
        className="relative flex min-w-0 flex-1 items-start gap-2 bg-surface px-2 py-0.5"
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

        <SwipeActionRail
          open={railOpen}
          className="-my-0.5 -mr-2"
          actions={[
            {
              key: "edit",
              label: "Edit",
              icon: Pencil,
              tone: "edit",
              onClick: (e) => {
                e.stopPropagation();
                hide();
                onToggleDetail();
              },
            },
            {
              key: "complete",
              label: completed ? "Mark not done" : "Complete",
              icon: completed ? Undo2 : Check,
              tone: completed ? "neutral" : "complete",
              disabled: isBlocked,
              onClick: (e) => {
                e.stopPropagation();
                hide();
                onToggleComplete();
              },
            },
          ]}
        />
      </div>
    </li>
  );
}

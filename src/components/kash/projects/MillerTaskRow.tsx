"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { TaskTagChips } from "@/components/kash/plan/TaskTagChips";
import { TaskDragHandle } from "@/components/kash/TaskDragHandle";
import Checkbox from "@/components/kash/ui/Checkbox";
import { Lock, withKashIcon } from "@/components/kash/ui/icon";
import { categorySolidVar } from "@/lib/projects/category-tokens";
import { TaskPriorityIndicator } from "@/components/kash/TaskPriorityIndicator";

import type { ProjectTask } from "./types";

const LockIcon = withKashIcon(Lock);

type Props = {
  task: ProjectTask;
  parentPhaseId: string | null;
  selected: boolean;
  focused: boolean;
  onOpenDetail: () => void;
  onToggleComplete: () => void;
  /**
   * P6 post-create feedback: pulse class applied to the row's own `<li>` (rather
   * than wrapping it in another `<li>`, which would nest list items).
   */
  highlightClassName?: string;
};

export default function MillerTaskRow({
  task,
  parentPhaseId,
  selected,
  focused,
  onOpenDetail,
  onToggleComplete,
  highlightClassName,
}: Props) {
  const completed = task.completedAt !== null;
  const isBlocked = !completed && task.isBlocked === true;
  const blockerLabel = task.blockerTitle ?? "blocker";

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
      className={`flex items-start gap-2 rounded-card px-2 py-0.5 transition ${
        isBlocked ? "border border-dashed border-ink-faint" : ""
      } ${selected ? "bg-[var(--surface-selected)]" : "hover:bg-surface"} ${
        focused ? "ring-2 ring-inset ring-[var(--accent-soft)]" : ""
      } ${isDragging ? "opacity-50" : ""} ${
        isOver ? "border-t-2 border-ink" : "border-t-2 border-transparent"
      } ${highlightClassName ?? ""}`}
    >
      <Checkbox
        checked={completed}
        disabled={isBlocked}
        onChange={onToggleComplete}
        onClick={(e) => e.stopPropagation()}
        aria-label={completed ? "Mark task incomplete" : "Mark task complete"}
        accentColor={task.categoryUnresolved ? "var(--ink)" : categorySolidVar(task.category)}
        className="shrink-0"
      />
      <button
        type="button"
        onClick={onOpenDetail}
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
      </button>
      <TaskPriorityIndicator priority={task.priority} />
      <TaskDragHandle listeners={listeners} attributes={dragAttributes} />
    </li>
  );
}

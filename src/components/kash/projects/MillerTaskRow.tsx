"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { TaskDragHandle } from "@/components/kash/TaskDragHandle";
import { TaskPriorityIndicator } from "@/components/kash/TaskPriorityIndicator";

import type { ProjectTask } from "./types";

type Props = {
  task: ProjectTask;
  parentPhaseId: string | null;
  selected: boolean;
  focused: boolean;
  onOpenDetail: () => void;
  onToggleComplete: () => void;
};

export default function MillerTaskRow({
  task,
  parentPhaseId,
  selected,
  focused,
  onOpenDetail,
  onToggleComplete,
}: Props) {
  const completed = task.completedAt !== null;

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
      className={`flex items-start gap-2 rounded-kash px-2 py-kash-task-y-compact transition ${
        selected ? "bg-[var(--surface-selected)]" : "hover:bg-surface"
      } ${focused ? "ring-2 ring-inset ring-[var(--accent-soft)]" : ""} ${
        isDragging ? "opacity-50" : ""
      } ${isOver ? "border-t-2 border-ink" : "border-t-2 border-transparent"}`}
    >
      <input
        type="checkbox"
        checked={completed}
        onChange={onToggleComplete}
        onClick={(e) => e.stopPropagation()}
        aria-label={completed ? "Mark task incomplete" : "Mark task complete"}
        className="shrink-0"
      />
      <button
        type="button"
        onClick={onOpenDetail}
        aria-expanded={selected}
        className={`line-clamp-4 min-w-0 flex-1 break-words text-left text-sm ${
          completed ? "text-ink-muted line-through" : "text-ink"
        }`}
      >
        {task.title}
      </button>
      <TaskPriorityIndicator priority={task.priority} />
      <TaskDragHandle listeners={listeners} attributes={dragAttributes} />
    </li>
  );
}

"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useRef } from "react";

import type { ProjectTask } from "./types";

const SINGLE_CLICK_DELAY_MS = 200;

type Props = {
  task: ProjectTask;
  parentPhaseId: string | null;
  selected: boolean;
  focused: boolean;
  onHighlight: () => void;
  onOpenDetail: () => void;
  onToggleComplete: () => void;
};

export default function MillerTaskRow({
  task,
  parentPhaseId,
  selected,
  focused,
  onHighlight,
  onOpenDetail,
  onToggleComplete,
}: Props) {
  const completed = task.completedAt !== null;
  const singleClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const handleClick = () => {
    singleClickTimer.current = setTimeout(() => {
      onHighlight();
      singleClickTimer.current = null;
    }, SINGLE_CLICK_DELAY_MS);
  };

  const handleDoubleClick = () => {
    if (singleClickTimer.current) {
      clearTimeout(singleClickTimer.current);
      singleClickTimer.current = null;
    }
    onOpenDetail();
  };

  return (
    <li
      ref={setRefs}
      data-miller-item
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`flex items-center gap-2 rounded-kash px-2 py-1.5 transition ${
        selected ? "bg-kash-accent/15" : "hover:bg-white/40"
      } ${focused ? "ring-2 ring-[var(--kash-accent-soft)]" : ""} ${
        isDragging ? "opacity-50" : ""
      } ${isOver ? "border-t-2 border-kash-accent" : "border-t-2 border-transparent"}`}
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
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        className={`flex-1 truncate text-left text-sm ${
          completed ? "text-kash-ink-muted line-through" : "text-kash-ink"
        }`}
      >
        {task.title}
      </button>
      {task.priority > 0 ? (
        <span
          className="shrink-0 text-xs text-kash-accent"
          aria-label={`Priority ${task.priority}`}
        >
          {"!".repeat(task.priority)}
        </span>
      ) : null}
      <button
        type="button"
        className="shrink-0 cursor-grab text-kash-ink-muted"
        aria-label="Drag task"
        tabIndex={-1}
        {...listeners}
        {...dragAttributes}
      >
        ⠿
      </button>
    </li>
  );
}

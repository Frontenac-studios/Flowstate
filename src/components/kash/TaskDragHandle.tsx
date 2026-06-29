"use client";

import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { forwardRef } from "react";

export type TaskDragHandleVariant =
  | "dots6"
  | "dots2col"
  | "grip_lines"
  | "unicode_dots"
  | "hover_reveal";

/** Default drag handle icon — three stacked grip lines. */
export const TASK_DRAG_HANDLE_VARIANT: TaskDragHandleVariant = "grip_lines";

type Props = {
  listeners?: SyntheticListenerMap;
  attributes?: Omit<DraggableAttributes, "tabIndex">;
  className?: string;
  variant?: TaskDragHandleVariant;
};

function IconDots6() {
  const r = 1.1;
  const xs = [3, 7];
  const ys = [2.5, 6, 9.5];
  return (
    <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden className="block">
      {xs.flatMap((x) =>
        ys.map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="currentColor" />)
      )}
    </svg>
  );
}

function IconDots2Col() {
  const r = 1.15;
  const xs = [3.5, 6.5];
  const ys = [2.5, 6, 9.5];
  return (
    <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden className="block">
      {xs.flatMap((x) =>
        ys.map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="currentColor" />)
      )}
    </svg>
  );
}

function IconGripLines() {
  return (
    <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden className="block">
      <rect x="2" y="2.7" width="6" height="0.8" rx="0.4" fill="currentColor" />
      <rect x="2" y="5.6" width="6" height="0.8" rx="0.4" fill="currentColor" />
      <rect x="2" y="8.5" width="6" height="0.8" rx="0.4" fill="currentColor" />
    </svg>
  );
}

function IconUnicodeDots() {
  return (
    <span aria-hidden className="block select-none text-[10px] leading-none tracking-tighter">
      ⋮⋮
    </span>
  );
}

function DragHandleIcon({ variant }: { variant: TaskDragHandleVariant }) {
  switch (variant) {
    case "dots6":
    case "hover_reveal":
      return <IconDots6 />;
    case "dots2col":
      return <IconDots2Col />;
    case "grip_lines":
      return <IconGripLines />;
    case "unicode_dots":
      return <IconUnicodeDots />;
  }
}

export const TaskDragHandle = forwardRef<HTMLButtonElement, Props>(function TaskDragHandle(
  { listeners, attributes, className = "", variant = TASK_DRAG_HANDLE_VARIANT },
  ref
) {
  const hoverReveal = variant === "hover_reveal";

  return (
    <button
      ref={ref}
      type="button"
      className={`text-ink-muted/25 hover:text-ink-muted/50 flex h-3 w-2.5 shrink-0 cursor-grab items-center justify-center self-center active:cursor-grabbing ${
        hoverReveal ? "opacity-0 group-hover:opacity-100" : ""
      } ${className}`.trim()}
      aria-label="Drag task"
      tabIndex={-1}
      {...listeners}
      {...attributes}
    >
      <DragHandleIcon variant={variant} />
    </button>
  );
});

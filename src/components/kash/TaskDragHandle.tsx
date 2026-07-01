"use client";

import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { forwardRef } from "react";

import { GripVertical, kashIconProps } from "@/components/kash/ui/icon";

export type TaskDragHandleVariant =
  | "dots6"
  | "dots2col"
  | "grip_lines"
  | "unicode_dots"
  | "hover_reveal";
export const TASK_DRAG_HANDLE_VARIANT: TaskDragHandleVariant = "grip_lines";

type Props = {
  listeners?: SyntheticListenerMap;
  attributes?: Omit<DraggableAttributes, "tabIndex">;
  className?: string;
  variant?: TaskDragHandleVariant;
};

function DragHandleIcon({ variant }: { variant: TaskDragHandleVariant }) {
  if (variant === "unicode_dots") {
    return (
      <span aria-hidden className="block select-none text-caption leading-none tracking-tighter">
        ⋮⋮
      </span>
    );
  }
  return <GripVertical {...kashIconProps({ tokenSize: "sm", className: "block" })} />;
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
      className={`text-ink-muted/25 hover:text-ink-muted/50 flex h-3 w-2.5 shrink-0 cursor-grab items-center justify-center self-center focus:outline-none focus-visible:shadow-[inset_0_0_0_var(--focus-ring-width)_var(--ink)] active:cursor-grabbing ${hoverReveal ? "opacity-0 group-hover:opacity-100" : ""} ${className}`.trim()}
      aria-label="Drag task"
      tabIndex={-1}
      {...listeners}
      {...attributes}
    >
      <DragHandleIcon variant={variant} />
    </button>
  );
});

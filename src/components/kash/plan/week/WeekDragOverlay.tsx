"use client";

import { GripVertical, kashIconProps } from "@/components/kash/ui/icon";

import type { PlanTaskRow } from "../TaskRow";

type Props = {
  task: PlanTaskRow | null;
};

/**
 * Spec v5 DragA: the lifted task — a white card with the overlay shadow (grip, open
 * check, title) that follows the pointer via DragOverlay on Week and Today.
 */
export function WeekDragOverlay({ task }: Props) {
  if (!task) return null;

  return (
    <div className="flex w-[min(19rem,calc(100vw-2rem))] cursor-grabbing items-center gap-3 rounded-card bg-surface px-4 py-2.5 shadow-menu">
      <GripVertical {...kashIconProps({ tokenSize: "sm", className: "shrink-0 text-ink-faint" })} />
      <span
        aria-hidden
        className="size-5 shrink-0 rounded-pill border-emphasis border-check-border"
      />
      <p className="line-clamp-2 text-body font-medium text-ink">{task.title}</p>
    </div>
  );
}

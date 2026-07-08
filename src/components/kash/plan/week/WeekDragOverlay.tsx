"use client";

import type { PlanTaskRow } from "../TaskRow";

type Props = {
  task: PlanTaskRow | null;
};

/** Lightweight drag preview for week task scheduling (follows pointer via DragOverlay). */
export function WeekDragOverlay({ task }: Props) {
  if (!task) return null;

  return (
    <div className="max-w-[min(20rem,calc(100vw-2rem))] cursor-grabbing rounded-card border border-subtle bg-surface px-3 py-2 shadow-overlay">
      <p className="line-clamp-3 text-sm font-medium text-ink">{task.title}</p>
    </div>
  );
}

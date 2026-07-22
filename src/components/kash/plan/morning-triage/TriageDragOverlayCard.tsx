"use client";

import type { ProjectCategory } from "@/lib/projects/categories";

import { triageCategoryRowTint } from "./triage-pick-styles";

type Props = {
  task: { title: string; category?: ProjectCategory | null } | null;
};

/** Drag ghost for triage rows — keeps the category edge so you know what you're holding. */
export function TriageDragOverlayCard({ task }: Props) {
  if (!task) return null;

  return (
    <div
      className={`max-w-[min(20rem,calc(100vw-2rem))] -rotate-1 cursor-grabbing border border-subtle bg-surface px-3 py-1.5 shadow-overlay ${
        task.category != null ? "rounded-r-row" : "rounded-row"
      }`}
      style={triageCategoryRowTint(task.category)}
    >
      <p className="line-clamp-2 text-caption font-medium text-ink">{task.title}</p>
    </div>
  );
}

"use client";

import Link from "next/link";

import { EstimateConfidenceHint } from "@/components/kash/projects/EstimateConfidenceHint";
import { categorySolidVar, categoryTextVar } from "@/lib/projects/category-tokens";
import { type ProjectCategory } from "@/lib/projects/categories";
import { formatDuration } from "@/lib/time/duration";

export type ProjectListItem = {
  id: string;
  name: string;
  slug: string;
  category: ProjectCategory;
  taskCount: number;
  completedCount: number;
  percent: number;
  completedWeight: number;
  totalWeight: number;
  timeSpentSeconds: number;
  lastActivityAt: string;
};

const FINISHING_PERCENT = 80;

export default function ProjectCard({
  project,
  folding = false,
  estimateSampleCount = 0,
}: {
  project: ProjectListItem;
  folding?: boolean;
  estimateSampleCount?: number;
}) {
  const stripe = categorySolidVar(project.category);
  const hasTasks = project.totalWeight > 0;
  const finishing = hasTasks && project.percent >= FINISHING_PERCENT;
  const timeLabel = project.timeSpentSeconds > 0 ? formatDuration(project.timeSpentSeconds) : null;

  return (
    <Link
      href={`/projects/${project.id}`}
      className={`kash-focus-visible block rounded-card border-2 p-4 shadow-surface outline-none transition hover:bg-surface-2 ${
        finishing ? "bg-surface" : "bg-surface"
      }${folding ? "project-fold-to-filed" : ""}`}
      style={{
        borderColor: stripe,
        ...(finishing
          ? {
              backgroundColor: `color-mix(in srgb, ${stripe} 6%, var(--surface))`,
            }
          : {}),
      }}
    >
      <h3 className="min-w-0 truncate font-medium text-ink">{project.name}</h3>

      <div
        className="mt-3 h-1 overflow-hidden rounded-full"
        style={{
          backgroundColor: hasTasks
            ? "var(--border)"
            : `color-mix(in srgb, ${stripe} 20%, var(--border))`,
        }}
      >
        {hasTasks ? (
          <span
            className="block h-full rounded-full"
            style={{ width: `${project.percent}%`, backgroundColor: stripe }}
          />
        ) : null}
      </div>
      <p
        className={`mt-1.5 text-caption ${finishing ? "" : "text-ink-faint"}`}
        style={finishing ? { color: categoryTextVar(project.category) } : undefined}
      >
        {!hasTasks
          ? "No tasks yet"
          : `${project.percent}% · ${project.completedCount} of ${project.taskCount} tasks`}
        {timeLabel ? ` · ${timeLabel}` : null}
        {hasTasks ? (
          <>
            {" · "}
            <EstimateConfidenceHint sampleCount={estimateSampleCount} />
          </>
        ) : null}
      </p>
    </Link>
  );
}

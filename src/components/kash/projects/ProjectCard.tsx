import Link from "next/link";

import { EstimateConfidenceHint } from "@/components/kash/projects/EstimateConfidenceHint";
import { categoryFillVar, categorySolidVar, categoryTextVar } from "@/lib/projects/category-tokens";
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
      className={`kash-focus-visible block rounded-card border p-4 outline-none transition hover:bg-surface-2 ${
        finishing ? "border-subtle" : "border-subtle bg-surface"
      }${folding ? "project-fold-to-filed" : ""}`}
      style={
        finishing
          ? {
              backgroundColor: `color-mix(in srgb, ${stripe} 6%, var(--surface))`,
            }
          : undefined
      }
    >
      <div className="flex items-center gap-2">
        <span
          className="h-3.5 shrink-0 rounded-full"
          style={{ width: "var(--stripe-width)", backgroundColor: stripe }}
          aria-hidden
        />
        <h3 className="min-w-0 flex-1 truncate font-medium text-ink">{project.name}</h3>
      </div>

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

/** D26 — dashed row linking loose tasks to Backlog category lens. */
export function LooseTasksRow({ category, count }: { category: ProjectCategory; count: number }) {
  const stripe = categorySolidVar(category);
  const fill = categoryFillVar(category);
  const text = categoryTextVar(category);

  return (
    <Link
      href={`/backlog?category=${category}`}
      className="kash-focus-visible flex items-center justify-between rounded-card border border-dashed px-3.5 py-2.5 text-sm outline-none transition hover:opacity-90"
      style={{
        borderColor: `color-mix(in srgb, ${stripe} 50%, transparent)`,
        backgroundColor: fill,
        color: text,
      }}
    >
      <span>
        {count} {count === 1 ? "task" : "tasks"}, no project
      </span>
      <span className="font-medium">view →</span>
    </Link>
  );
}

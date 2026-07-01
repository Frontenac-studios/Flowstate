import Link from "next/link";

import { categorySolidVar } from "@/lib/projects/category-tokens";
import { type ProjectCategory } from "@/lib/projects/categories";

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
};

export default function ProjectCard({
  project,
  folding = false,
}: {
  project: ProjectListItem;
  folding?: boolean;
}) {
  const stripe = categorySolidVar(project.category);

  return (
    <Link
      href={`/projects/${project.id}`}
      className={`kash-focus-visible block rounded-card border border-subtle bg-surface p-4 transition hover:bg-surface-2 outline-none${folding ? "project-fold-to-filed" : ""}`}
    >
      <div className="flex items-center gap-2">
        <span
          className="h-3.5 shrink-0 rounded-full"
          style={{ width: "var(--stripe-width)", backgroundColor: stripe }}
          aria-hidden
        />
        <h3 className="min-w-0 flex-1 truncate font-medium text-ink">{project.name}</h3>
      </div>

      <div className="mt-3 h-1 overflow-hidden rounded-full bg-border">
        <span
          className="block h-full rounded-full"
          style={{ width: `${project.percent}%`, backgroundColor: stripe }}
        />
      </div>
      <p className="mt-1.5 text-caption text-ink-faint">
        {project.totalWeight === 0
          ? "No tasks yet"
          : `${project.percent}% · ${project.completedCount} of ${project.taskCount} tasks`}
      </p>
    </Link>
  );
}

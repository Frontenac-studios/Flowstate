import Link from "next/link";

import { categorySolidVar } from "@/lib/projects/category-tokens";
import { type ProjectCategory } from "@/lib/projects/categories";
import { projectProgress } from "@/lib/projects/project-progress";

export type ProjectListItem = {
  id: string;
  name: string;
  slug: string;
  category: ProjectCategory;
  taskCount: number;
  completedCount: number;
};

export default function ProjectCard({ project }: { project: ProjectListItem }) {
  const stripe = categorySolidVar(project.category);
  const { percent, completed, total } = projectProgress(project.completedCount, project.taskCount);

  return (
    <Link
      href={`/projects/${project.id}`}
      className="border-subtle block rounded-card border bg-surface p-4 transition hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="flex items-center gap-2">
        <span
          className="h-3.5 w-[3px] shrink-0 rounded-full"
          style={{ backgroundColor: stripe }}
          aria-hidden
        />
        <h3 className="min-w-0 flex-1 truncate font-medium text-ink">{project.name}</h3>
      </div>

      <div className="mt-3 h-1 overflow-hidden rounded-full bg-border">
        <span
          className="block h-full rounded-full"
          style={{ width: `${percent}%`, backgroundColor: stripe }}
        />
      </div>
      <p className="mt-1.5 text-caption text-ink-faint">
        {total === 0 ? "No tasks yet" : `${percent}% · ${completed} of ${total} tasks`}
      </p>
    </Link>
  );
}

import Link from "next/link";

import { PROJECT_CATEGORY_META, type ProjectCategory } from "@/lib/projects/categories";

export type ProjectListItem = {
  id: string;
  name: string;
  slug: string;
  category: ProjectCategory;
  description: string | null;
};

export default function ProjectCard({ project }: { project: ProjectListItem }) {
  const meta = PROJECT_CATEGORY_META[project.category];
  return (
    <Link
      href={`/projects/${project.id}`}
      className="glass-panel-opaque block p-4 transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-kash-accent"
      style={{ border: `2px solid ${meta.color}` }}
    >
      <h3 className="font-medium text-kash-ink">{project.name}</h3>
      {project.description ? (
        <p className="mt-1 line-clamp-2 text-sm text-kash-ink-muted">{project.description}</p>
      ) : (
        <p className="text-kash-ink-muted/60 mt-1 text-sm italic">No description</p>
      )}
    </Link>
  );
}

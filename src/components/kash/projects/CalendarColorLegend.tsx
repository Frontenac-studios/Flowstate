"use client";

import Link from "next/link";

import { PROJECT_CATEGORIES, categoryLabel, type ProjectCategory } from "@/lib/projects/categories";
import { categorySolidVar } from "@/lib/projects/category-tokens";
import type { CalendarColorMode } from "@/lib/projects/calendar-color-mode";
import { projectCycleSolidVar } from "@/lib/projects/project-cycle-color";

type ProjectLegendItem = {
  id: string;
  name: string;
  category: ProjectCategory;
  projectIndex: number;
};

type Props = {
  mode: CalendarColorMode;
  projects: readonly ProjectLegendItem[];
};

export default function CalendarColorLegend({ mode, projects }: Props) {
  if (mode === "category") {
    return (
      <ul
        className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-muted"
        aria-label="Category color legend"
      >
        {PROJECT_CATEGORIES.map((category) => (
          <li key={category} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: categorySolidVar(category) }}
              aria-hidden
            />
            <span>{categoryLabel(category)}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (projects.length === 0) return null;
  return (
    <ul
      className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-muted"
      aria-label="Project color legend"
    >
      {projects.map((project) => (
        <li key={project.id} className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: projectCycleSolidVar(project.projectIndex) }}
            aria-hidden
          />
          <Link
            href={`/projects/${project.id}`}
            className="text-ink-muted transition hover:text-accent hover:underline"
          >
            {project.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

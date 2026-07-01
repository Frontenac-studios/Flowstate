"use client";

import Link from "next/link";

import { InPageSwitcher } from "../InPageSwitcher";
import CategoryBadge from "./CategoryBadge";
import type { ProjectDetail, ProjectViewMode } from "./types";

type Props = {
  project: ProjectDetail;
  viewMode: ProjectViewMode;
  onViewModeChange: (mode: ProjectViewMode) => void;
  showBackToProjects?: boolean;
};

const VIEW_MODES: { value: ProjectViewMode; label: string }[] = [
  { value: "columns", label: "Columns" },
  { value: "calendar", label: "Calendar" },
];

export default function ProjectWorkspaceHeader({
  project,
  viewMode,
  onViewModeChange,
  showBackToProjects = false,
}: Props) {
  return (
    <header className="relative z-sticky flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface px-5 py-4 shadow-overlay">
      <div className="flex flex-wrap items-center gap-3">
        {showBackToProjects ? (
          <Link
            href="/projects"
            className="rounded-pill border border-border bg-surface px-3 py-1.5 text-sm text-ink-muted transition hover:text-ink focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)]"
          >
            ← Projects
          </Link>
        ) : null}
        <h1 className="text-xl font-semibold text-ink">{project.name}</h1>
        <CategoryBadge category={project.category} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/projects/${project.id}/imports`}
          className="text-sm text-ink-muted transition hover:text-ink focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)]"
        >
          Import history →
        </Link>
        <InPageSwitcher
          options={VIEW_MODES}
          value={viewMode}
          onChange={onViewModeChange}
          ariaLabel="View mode"
        />
      </div>
    </header>
  );
}

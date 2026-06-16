"use client";

import Link from "next/link";

import { InPageSwitcher } from "../InPageSwitcher";
import CategoryBadge from "./CategoryBadge";
import ImportHistoryPanel from "./ImportHistoryPanel";
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
    <header className="glass-panel-strong relative z-30 flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">
        {showBackToProjects ? (
          <Link
            href="/projects"
            className="glass-pill px-3 py-1.5 text-sm text-kash-ink-muted transition hover:text-kash-ink"
          >
            ← Projects
          </Link>
        ) : null}
        <h1 className="text-xl font-semibold text-kash-ink">{project.name}</h1>
        <CategoryBadge category={project.category} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ImportHistoryPanel projectId={project.id} />
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

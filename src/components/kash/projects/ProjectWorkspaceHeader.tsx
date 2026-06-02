"use client";

import CategoryBadge from "./CategoryBadge";
import ImportHistoryPanel from "./ImportHistoryPanel";
import type { ProjectDetail, ProjectViewMode } from "./types";

type Props = {
  project: ProjectDetail;
  viewMode: ProjectViewMode;
  onViewModeChange: (mode: ProjectViewMode) => void;
};

const VIEW_MODES: { value: ProjectViewMode; label: string }[] = [
  { value: "columns", label: "Columns" },
  { value: "calendar", label: "Calendar" },
];

export default function ProjectWorkspaceHeader({ project, viewMode, onViewModeChange }: Props) {
  return (
    <header className="glass-panel-strong flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-kash-ink">{project.name}</h1>
        <CategoryBadge category={project.category} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ImportHistoryPanel projectId={project.id} />
        <div className="glass-pill flex text-sm" role="group" aria-label="View mode">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => onViewModeChange(mode.value)}
              aria-pressed={viewMode === mode.value}
              className={`rounded-full px-3 py-1 transition ${
                viewMode === mode.value
                  ? "bg-kash-accent text-white"
                  : "text-kash-ink-muted hover:text-kash-ink"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

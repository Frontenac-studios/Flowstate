"use client";

import Link from "next/link";
import { useState } from "react";

import { EstimateConfidenceHint } from "@/components/kash/projects/EstimateConfidenceHint";
import { MoreHorizontal, kashIconProps } from "@/components/kash/ui/icon";
import IconButton from "@/components/kash/ui/IconButton";
import { formatDuration } from "@/lib/time/duration";

import { InPageSwitcher } from "../InPageSwitcher";
import CategoryBadge from "./CategoryBadge";
import ProjectMenu from "./ProjectMenu";
import type { ProjectDetail, ProjectViewMode } from "./types";

type Props = {
  project: ProjectDetail;
  viewMode: ProjectViewMode;
  onViewModeChange: (mode: ProjectViewMode) => void;
  showBackToProjects?: boolean;
  timeSpentSeconds?: number;
  estimateSampleCount?: number;
  onOpenSetup?: () => void;
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
  timeSpentSeconds = 0,
  estimateSampleCount = 0,
  onOpenSetup,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const timeLabel = timeSpentSeconds > 0 ? formatDuration(timeSpentSeconds) : null;

  return (
    <header className="relative z-sticky flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface px-5 py-4 shadow-surface">
      <div className="flex min-w-0 flex-col gap-1">
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
        {timeLabel ? (
          <p className="text-xs text-ink-muted">
            {timeLabel} logged
            {" · "}
            <EstimateConfidenceHint sampleCount={estimateSampleCount} />
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <InPageSwitcher
          options={VIEW_MODES}
          value={viewMode}
          onChange={onViewModeChange}
          ariaLabel="View mode"
        />
        <div className="relative">
          <IconButton
            type="button"
            aria-label={`Actions for ${project.name}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MoreHorizontal {...kashIconProps({ tokenSize: "md" })} aria-hidden />
          </IconButton>
          {menuOpen ? (
            <ProjectMenu
              project={project}
              onClose={() => setMenuOpen(false)}
              onOpenSetup={onOpenSetup}
            />
          ) : null}
        </div>
      </div>
    </header>
  );
}

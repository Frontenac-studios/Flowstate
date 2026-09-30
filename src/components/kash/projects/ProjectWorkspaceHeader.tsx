"use client";

import { useRef, useState } from "react";

import { EstimateConfidenceHint } from "@/components/kash/projects/EstimateConfidenceHint";
import Button from "@/components/kash/ui/Button";
import { MoreHorizontal, kashIconProps } from "@/components/kash/ui/icon";
import IconButton from "@/components/kash/ui/IconButton";
import { UnderlineTabs } from "@/components/kash/ui/UnderlineTabs";
import { projectSolidVar, projectTextVar } from "@/lib/projects/project-hue";
import { formatDuration } from "@/lib/time/duration";

import ProjectMenu from "./ProjectMenu";
import type { ProjectDetail, ProjectViewMode } from "./types";

type Props = {
  project: ProjectDetail;
  viewMode: ProjectViewMode;
  onViewModeChange: (mode: ProjectViewMode) => void;
  /** 0–100, or null while the tasks load. */
  percentComplete: number | null;
  editing: boolean;
  onToggleEdit: () => void;
  onAddTask: () => void;
  timeSpentSeconds?: number;
  estimateSampleCount?: number;
  showTemplateFeatures?: boolean;
};

const TABS: { value: ProjectViewMode; label: string }[] = [
  { value: "tasks", label: "Tasks" },
  { value: "timeline", label: "Timeline" },
  { value: "columns", label: "Columns" },
  { value: "calendar", label: "Calendar" },
];

/**
 * Spec v4 project header (ProjPageB + ProgressA + ToggleB): a label-caps line with the
 * project dot and "% complete" (muted, no bar), the 40px name, Edit (secondary) and
 * Add task (primary), then underline tabs in the project's colour.
 */
export default function ProjectWorkspaceHeader({
  project,
  viewMode,
  onViewModeChange,
  percentComplete,
  editing,
  onToggleEdit,
  onAddTask,
  timeSpentSeconds = 0,
  estimateSampleCount = 0,
  showTemplateFeatures = true,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const timeLabel = timeSpentSeconds > 0 ? formatDuration(timeSpentSeconds) : null;
  const hueSource = { category: project.category, hue: project.hue };

  return (
    <header className="relative z-sticky flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-micro font-semibold uppercase tracking-caps">
        <span
          aria-hidden
          className="size-2.5 rounded-full"
          style={{ background: projectSolidVar(hueSource) }}
        />
        <span style={{ color: projectTextVar(hueSource) }}>
          {project.category === "personal" ? "Personal project" : "Project"}
        </span>
        {percentComplete != null ? (
          <>
            <span className="text-ink-faint">·</span>
            <span className="text-ink-muted">{percentComplete}% complete</span>
          </>
        ) : null}
        {timeLabel ? (
          <>
            <span className="text-ink-faint">·</span>
            <span className="normal-case tracking-normal text-ink-muted">
              {timeLabel} logged · <EstimateConfidenceHint sampleCount={estimateSampleCount} />
            </span>
          </>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <h1 className="min-w-0 flex-1 break-words text-xl font-bold text-ink">{project.name}</h1>
        <Button variant="secondary" className="text-sm" onClick={onToggleEdit}>
          {editing ? "Done" : "Edit"}
        </Button>
        <Button className="text-sm" onClick={onAddTask}>
          Add task
        </Button>
        <div className="relative">
          <IconButton
            ref={menuTriggerRef}
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
              showTemplateFeatures={showTemplateFeatures}
              triggerRef={menuTriggerRef}
              onClose={() => setMenuOpen(false)}
            />
          ) : null}
        </div>
      </div>

      {editing ? null : (
        <UnderlineTabs
          tabs={TABS}
          value={viewMode}
          onChange={onViewModeChange}
          ariaLabel="Project view"
          accent={projectSolidVar(hueSource)}
          className="mt-2"
        />
      )}
    </header>
  );
}

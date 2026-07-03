"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { buildPhaseTree } from "@/lib/projects/phase-tree";
import { isProjectComplete } from "@/lib/projects/is-project-complete";
import { useTRPC } from "@/trpc/client";

import CalendarBoardView from "./CalendarBoardView";
import MillerColumnsView from "./MillerColumnsView";
import ProjectWorkspaceHeader from "./ProjectWorkspaceHeader";
import { ProjectSlipReplanCard } from "./ProjectSlipReplanCard";
import { ProjectTemplateSuggestSlot } from "./ProjectTemplateSuggestSlot";
import type { ProjectDetail, ProjectViewMode } from "./types";

export default function ProjectWorkspace({
  project: initialProject,
  showBackToProjects = false,
}: {
  project: ProjectDetail;
  showBackToProjects?: boolean;
}) {
  const trpc = useTRPC();

  const { data: project } = useQuery(
    trpc.projects.getById.queryOptions({ id: initialProject.id }, { initialData: initialProject })
  );

  const phasesQuery = useQuery(
    trpc.phases.listByProject.queryOptions({ projectId: initialProject.id })
  );
  const tasksQuery = useQuery(
    trpc.tasks.listByProject.queryOptions({ projectId: initialProject.id })
  );
  const { data: timeRollups } = useQuery(
    trpc.projects.getTimeRollups.queryOptions({ projectId: initialProject.id })
  );
  const { data: estimateSampleCount = 0 } = useQuery(
    trpc.projects.estimateSampleCount.queryOptions()
  );

  const [viewMode, setViewMode] = useState<ProjectViewMode>("columns");
  const [selectedPath, setSelectedPath] = useState<string[]>([]);

  const tree = useMemo(
    () => buildPhaseTree(phasesQuery.data ?? [], tasksQuery.data ?? []),
    [phasesQuery.data, tasksQuery.data]
  );

  const projectComplete = useMemo(() => {
    const tasks = tasksQuery.data ?? [];
    const completedCount = tasks.filter((task) => task.completedAt !== null).length;
    return isProjectComplete({ taskCount: tasks.length, completedCount });
  }, [tasksQuery.data]);

  const isLoading = phasesQuery.isLoading || tasksQuery.isLoading;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <ProjectTemplateSuggestSlot
        projectId={project.id}
        projectName={project.name}
        isComplete={projectComplete}
      >
        <ProjectWorkspaceHeader
          project={project}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showBackToProjects={showBackToProjects}
          timeSpentSeconds={timeRollups?.projectSeconds ?? 0}
          estimateSampleCount={estimateSampleCount}
        />
      </ProjectTemplateSuggestSlot>

      <ProjectSlipReplanCard projectId={project.id} />

      {isLoading ? (
        <p className="text-ink-muted">Loading project…</p>
      ) : viewMode === "columns" ? (
        <MillerColumnsView
          tree={tree}
          projectId={initialProject.id}
          category={project.category}
          phases={phasesQuery.data ?? []}
          tasks={tasksQuery.data ?? []}
          selectedPath={selectedPath}
          onSelectPath={setSelectedPath}
          estimateSampleCount={estimateSampleCount}
        />
      ) : (
        <CalendarBoardView tree={tree} projectId={initialProject.id} category={project.category} />
      )}
    </div>
  );
}

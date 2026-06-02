"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { buildPhaseTree } from "@/lib/projects/phase-tree";
import { useTRPC } from "@/trpc/client";

import CalendarBoardView from "./CalendarBoardView";
import MillerColumnsView from "./MillerColumnsView";
import ProjectWorkspaceHeader from "./ProjectWorkspaceHeader";
import type { ProjectDetail, ProjectViewMode } from "./types";

export default function ProjectWorkspace({ project: initialProject }: { project: ProjectDetail }) {
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

  const [viewMode, setViewMode] = useState<ProjectViewMode>("columns");
  const [selectedPath, setSelectedPath] = useState<string[]>([]);

  const tree = useMemo(
    () => buildPhaseTree(phasesQuery.data ?? [], tasksQuery.data ?? []),
    [phasesQuery.data, tasksQuery.data]
  );

  const isLoading = phasesQuery.isLoading || tasksQuery.isLoading;

  return (
    <div className="flex flex-col gap-6">
      <ProjectWorkspaceHeader
        project={project}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {isLoading ? (
        <p className="text-kash-ink-muted">Loading project…</p>
      ) : viewMode === "columns" ? (
        <MillerColumnsView
          tree={tree}
          projectId={initialProject.id}
          projectSlug={project.slug}
          phases={phasesQuery.data ?? []}
          selectedPath={selectedPath}
          onSelectPath={setSelectedPath}
        />
      ) : (
        <CalendarBoardView tree={tree} projectId={initialProject.id} category={project.category} />
      )}
    </div>
  );
}

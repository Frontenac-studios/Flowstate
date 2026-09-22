"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { buildPhaseTree } from "@/lib/projects/phase-tree";
import { isProjectComplete } from "@/lib/projects/is-project-complete";
import { hasTemplateFeatures } from "@/lib/projects/template-milestone";
import { QueryErrorNotice } from "@/components/kash/ui/QueryErrorNotice";
import { useTRPC } from "@/trpc/client";

import CalendarBoardView from "./CalendarBoardView";
import MillerColumnsView from "./MillerColumnsView";
import PlanOutline from "./PlanOutline";
import ProjectDetailsStrip from "./ProjectDetailsStrip";
import PhaseBurnBars from "./PhaseBurnBars";
import ProjectMilestoneStrip from "./ProjectMilestoneStrip";
import ProjectWorkspaceHeader from "./ProjectWorkspaceHeader";
import { ProjectTaskFinder } from "./ProjectTaskFinder";
import { useFocusParam } from "@/hooks/useFocusParam";
import { phasePathForTask } from "@/lib/projects/phase-path";
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
  const milestonesQuery = useQuery(
    trpc.projectMilestones.listByProject.queryOptions({ projectId: initialProject.id })
  );
  const { data: timeRollups } = useQuery(
    trpc.projects.getTimeRollups.queryOptions({ projectId: initialProject.id })
  );
  const { data: estimateSampleCount = 0 } = useQuery(
    trpc.projects.estimateSampleCount.queryOptions()
  );
  const { data: allProjects = [] } = useQuery(trpc.projects.list.queryOptions());
  const showTemplateFeatures = hasTemplateFeatures(allProjects.length);

  const [viewMode, setViewMode] = useState<ProjectViewMode>("columns");
  const [selectedPath, setSelectedPath] = useState<string[]>([]);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Kash 3.2: creation no longer hands off to the wizard. `?setup=new` used to
  // auto-open a four-step modal the moment a project was created — two modals and a
  // route change for one intent — and the param was stripped on mount, so Escaping
  // it was a one-way door. Structure is now added on the board itself.
  //
  // The param is still swallowed rather than ignored so an old bookmark or an
  // in-flight link doesn't land on a URL that means nothing.
  useEffect(() => {
    if (searchParams.get("setup") === "new") {
      router.replace(pathname);
    }
  }, [searchParams, router, pathname]);

  // `?focus=<taskId>`: the board reveals and pulses the task, then drops the param.
  const { focusId: focusTaskId, clearFocus: clearFocusParam } = useFocusParam();

  const tree = useMemo(
    () => buildPhaseTree(phasesQuery.data ?? [], tasksQuery.data ?? []),
    [phasesQuery.data, tasksQuery.data]
  );

  const projectComplete = useMemo(() => {
    const tasks = tasksQuery.data ?? [];
    const completedCount = tasks.filter((task) => task.completedAt !== null).length;
    return isProjectComplete({ taskCount: tasks.length, completedCount });
  }, [tasksQuery.data]);

  // milestonesQuery stays in the loading gate: the milestone strip reads it, and
  // rendering the board before it resolves flashes an empty strip on every visit.
  const isLoading = phasesQuery.isLoading || tasksQuery.isLoading || milestonesQuery.isLoading;
  const isError = phasesQuery.isError || tasksQuery.isError || milestonesQuery.isError;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <ProjectTemplateSuggestSlot
        projectId={project.id}
        projectName={project.name}
        category={project.category}
        isComplete={projectComplete}
        showTemplateFeatures={showTemplateFeatures}
      >
        <ProjectWorkspaceHeader
          project={project}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showBackToProjects={showBackToProjects}
          timeSpentSeconds={timeRollups?.projectSeconds ?? 0}
          estimateSampleCount={estimateSampleCount}
          showTemplateFeatures={showTemplateFeatures}
        />
      </ProjectTemplateSuggestSlot>

      <ProjectSlipReplanCard projectId={project.id} />

      {isLoading ? (
        <p className="text-ink-muted">Loading project…</p>
      ) : isError ? (
        <QueryErrorNotice
          message="This project's board didn't load."
          onRetry={() => {
            void phasesQuery.refetch();
            void tasksQuery.refetch();
            void milestonesQuery.refetch();
          }}
        />
      ) : viewMode === "plan" ? (
        // Plan mode (Kash 3.2, 2D + 3B): the same tree the Columns view renders, laid
        // out whole, with the project-level facts above it. Natural height with its
        // own scroll, so a long outline never clips under the fill layout.
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          <ProjectDetailsStrip project={project} />
          <PlanOutline projectId={initialProject.id} category={project.category} tree={tree} />
        </div>
      ) : viewMode === "columns" ? (
        <>
          <ProjectTaskFinder
            tasks={tasksQuery.data ?? []}
            phaseName={(phaseId) =>
              phasesQuery.data?.find((phase) => phase.id === phaseId)?.name ?? null
            }
            onReveal={(task) =>
              setSelectedPath(phasePathForTask(phasesQuery.data ?? [], task.phaseId))
            }
          />
          <MillerColumnsView
            tree={tree}
            projectId={initialProject.id}
            projectSlug={project.slug}
            category={project.category}
            phases={phasesQuery.data ?? []}
            tasks={tasksQuery.data ?? []}
            selectedPath={selectedPath}
            onSelectPath={setSelectedPath}
            focusTaskId={focusTaskId}
            onFocusHandled={clearFocusParam}
            milestones={milestonesQuery.data ?? []}
            estimateSampleCount={estimateSampleCount}
          />
        </>
      ) : (
        // Calendar is natural-height; under the fill layout give it the remaining
        // space with its own vertical scroll so a tall timeline never clips.
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
          {(milestonesQuery.data?.length ?? 0) > 0 ? (
            <ProjectMilestoneStrip
              projectId={initialProject.id}
              milestones={milestonesQuery.data ?? []}
            />
          ) : null}
          <CalendarBoardView
            tree={tree}
            projectId={initialProject.id}
            category={project.category}
            milestones={milestonesQuery.data ?? []}
          />
        </div>
      )}

      {/*
        W15 — estimate vs actual, the deepest of the three altitudes. Outside the
        view switch: the plan is a property of the project, not of how you happen to
        be looking at its tasks today.
      */}
      <PhaseBurnBars projectId={initialProject.id} />
    </div>
  );
}

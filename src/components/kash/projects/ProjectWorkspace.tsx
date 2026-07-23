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
import ProjectMilestoneStrip from "./ProjectMilestoneStrip";
import ProjectSetupWizard from "./ProjectSetupWizard";
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
  const milestonesQuery = useQuery(
    trpc.projectMilestones.listByProject.queryOptions({ projectId: initialProject.id })
  );
  const { data: timeRollups } = useQuery(
    trpc.projects.getTimeRollups.queryOptions({ projectId: initialProject.id })
  );
  const { data: similarityLinks = [] } = useQuery(
    trpc.projects.listSimilarityLinks.queryOptions({ projectId: initialProject.id })
  );
  const similarProjectIds = useMemo(
    () => similarityLinks.map((link) => link.similarProjectId),
    [similarityLinks]
  );
  const { data: estimateSampleCount = 0 } = useQuery(
    trpc.projects.estimateSampleCount.queryOptions(
      similarProjectIds.length > 0 ? { similarProjectIds } : undefined
    )
  );
  const { data: allProjects = [] } = useQuery(trpc.projects.list.queryOptions());
  const showTemplateFeatures = hasTemplateFeatures(allProjects.length);

  const [viewMode, setViewMode] = useState<ProjectViewMode>("columns");
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [setupMode, setSetupMode] = useState<"edit" | "new-blank">("edit");

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Auto-launch the setup wizard right after blank project creation (?setup=new), then
  // strip the param so a refresh doesn't reopen it.
  useEffect(() => {
    if (searchParams.get("setup") === "new") {
      setWizardOpen(true);
      setSetupMode("new-blank");
      router.replace(pathname);
    }
  }, [searchParams, router, pathname]);

  const tree = useMemo(
    () => buildPhaseTree(phasesQuery.data ?? [], tasksQuery.data ?? []),
    [phasesQuery.data, tasksQuery.data]
  );

  const projectComplete = useMemo(() => {
    const tasks = tasksQuery.data ?? [];
    const completedCount = tasks.filter((task) => task.completedAt !== null).length;
    return isProjectComplete({ taskCount: tasks.length, completedCount });
  }, [tasksQuery.data]);

  // milestonesQuery belongs here too: ProjectSetupWizard seeds its drafts from
  // `milestones` once on open, so opening before this resolves seeds every draft
  // without an id and each Save inserts a fresh duplicate set.
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
          onOpenSetup={() => {
            setSetupMode("edit");
            setWizardOpen(true);
          }}
        />
      </ProjectTemplateSuggestSlot>

      <ProjectSlipReplanCard projectId={project.id} />

      {(milestonesQuery.data?.length ?? 0) > 0 ? (
        <ProjectMilestoneStrip
          milestones={milestonesQuery.data ?? []}
          onEdit={() => {
            setSetupMode("edit");
            setWizardOpen(true);
          }}
        />
      ) : null}

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
      ) : viewMode === "columns" ? (
        <MillerColumnsView
          tree={tree}
          projectId={initialProject.id}
          projectSlug={project.slug}
          category={project.category}
          phases={phasesQuery.data ?? []}
          tasks={tasksQuery.data ?? []}
          selectedPath={selectedPath}
          onSelectPath={setSelectedPath}
          estimateSampleCount={estimateSampleCount}
          onOpenSetup={() => {
            setSetupMode("edit");
            setWizardOpen(true);
          }}
        />
      ) : (
        <CalendarBoardView
          tree={tree}
          projectId={initialProject.id}
          category={project.category}
          milestones={milestonesQuery.data ?? []}
        />
      )}

      {/*
        Only mount once the queries the wizard seeds from have resolved. It seeds
        its drafts once on open, so mounting early would seed ids-less drafts and
        every Save would insert duplicates. Several entry points (header, milestone
        strip, board) can set wizardOpen, so gate here rather than per-trigger.
      */}
      <ProjectSetupWizard
        open={wizardOpen && !isLoading}
        project={project}
        phases={phasesQuery.data ?? []}
        milestones={milestonesQuery.data ?? []}
        setupMode={setupMode}
        onClose={() => {
          setWizardOpen(false);
          setSetupMode("edit");
        }}
      />
    </div>
  );
}

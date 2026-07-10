"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { ColoredEmptyInvitation } from "@/components/kash/ui/ColoredEmptyInvitation";
import { QueryErrorNotice } from "@/components/kash/ui/QueryErrorNotice";
import Button from "@/components/kash/ui/Button";
import { isProjectComplete } from "@/lib/projects/is-project-complete";
import { hasTemplateFeatures } from "@/lib/projects/template-milestone";
import { useTRPC } from "@/trpc/client";

import { InPageSwitcher } from "../InPageSwitcher";
import CompletedProjectsSection from "./CompletedProjectsSection";
import LooseTasksCard from "./LooseTasksCard";
import MultiProjectCalendarView from "./MultiProjectCalendarView";
import NewProjectDialog from "./NewProjectDialog";
import ProjectCard from "./ProjectCard";
import { ProjectTemplateSuggestSlot } from "./ProjectTemplateSuggestSlot";
import { useProjectFoldTransitions } from "./useProjectFoldTransitions";

import "./projects-motion.css";

type IndexViewMode = "gallery" | "calendar";

export default function ProjectsIndex() {
  const trpc = useTRPC();
  const router = useRouter();
  const {
    data: projects,
    isLoading,
    isError,
    refetch: refetchProjects,
  } = useQuery(trpc.projects.list.queryOptions());
  const { data: looseByCategory = [] } = useQuery(
    trpc.projects.listLooseTaskCountsByCategory.queryOptions()
  );
  const { data: estimateSampleCount = 0 } = useQuery(
    trpc.projects.estimateSampleCount.queryOptions()
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [indexView, setIndexView] = useState<IndexViewMode>("gallery");

  const projectCount = projects?.length ?? 0;
  const showTemplateFeatures = hasTemplateFeatures(projectCount);
  const totalLooseCount = useMemo(
    () => looseByCategory.reduce((sum, row) => sum + row.count, 0),
    [looseByCategory]
  );
  const hasProjects = projectCount > 0;
  const hasGalleryContent = hasProjects || totalLooseCount > 0;

  const allVisible = useMemo(() => projects ?? [], [projects]);
  const { activeProjects, completedProjects, foldingId } = useProjectFoldTransitions(allVisible);

  const sortedActiveProjects = useMemo(
    () =>
      [...activeProjects].sort(
        (a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
      ),
    [activeProjects]
  );

  const handleCreated = ({ id, fromTemplate }: { id: string; fromTemplate: boolean }) => {
    setDialogOpen(false);
    router.push(fromTemplate ? `/projects/${id}` : `/projects/${id}?setup=new`);
  };

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-ink">Projects</h1>
          {hasProjects ? (
            <InPageSwitcher
              options={[
                { value: "gallery", label: "Gallery" },
                { value: "calendar", label: "Calendar" },
              ]}
              value={indexView}
              onChange={setIndexView}
              ariaLabel="Projects index view"
            />
          ) : null}
        </div>
        <Button type="button" onClick={() => setDialogOpen(true)}>
          New project
        </Button>
      </div>

      <NewProjectDialog
        open={dialogOpen}
        showTemplateFeatures={showTemplateFeatures}
        onClose={() => setDialogOpen(false)}
        onCreated={handleCreated}
      />

      {indexView === "calendar" ? (
        <MultiProjectCalendarView />
      ) : isError ? (
        <QueryErrorNotice
          message="Your projects didn't load."
          onRetry={() => void refetchProjects()}
        />
      ) : isLoading ? (
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
          aria-label="Loading projects"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-card border border-subtle bg-surface-2"
            />
          ))}
        </div>
      ) : !hasGalleryContent ? (
        <ColoredEmptyInvitation
          title="Start your first project"
          hint="Phases and tasks live here — capture structure as you go."
          action={
            <Button type="button" onClick={() => setDialogOpen(true)}>
              New project
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {totalLooseCount > 0 ? <LooseTasksCard count={totalLooseCount} /> : null}
            {sortedActiveProjects.map((project) => (
              <ProjectTemplateSuggestSlot
                key={project.id}
                projectId={project.id}
                projectName={project.name}
                category={project.category}
                isComplete={isProjectComplete(project)}
                showTemplateFeatures={showTemplateFeatures}
              >
                <ProjectCard
                  project={project}
                  folding={foldingId === project.id}
                  estimateSampleCount={estimateSampleCount}
                />
              </ProjectTemplateSuggestSlot>
            ))}
          </div>

          <CompletedProjectsSection
            projects={completedProjects}
            showTemplateFeatures={showTemplateFeatures}
          />
        </>
      )}
    </section>
  );
}

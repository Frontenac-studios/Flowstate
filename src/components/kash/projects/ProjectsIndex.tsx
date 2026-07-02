"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { ColoredEmptyInvitation } from "@/components/kash/ui/ColoredEmptyInvitation";
import Button from "@/components/kash/ui/Button";
import { readMotionDurationMs, MOTION_TOKEN } from "@/lib/animate/motion-tokens";
import { PROJECT_CATEGORIES, categoryLabel, type ProjectCategory } from "@/lib/projects/categories";
import { categorySolidVar } from "@/lib/projects/category-tokens";
import { useTRPC } from "@/trpc/client";

import { InPageSwitcher } from "../InPageSwitcher";
import CompletedProjectsSection from "./CompletedProjectsSection";
import MultiProjectCalendarView from "./MultiProjectCalendarView";
import NewProjectForm from "./NewProjectForm";
import ProjectCard, { LooseTasksRow, type ProjectListItem } from "./ProjectCard";
import { ProjectTemplateSuggestChip } from "./ProjectTemplateSuggestChip";
import { useProjectFoldTransitions } from "./useProjectFoldTransitions";

import "./projects-motion.css";

type IndexViewMode = "gallery" | "calendar";

export default function ProjectsIndex() {
  const trpc = useTRPC();
  const { data: projects, isLoading } = useQuery(trpc.projects.list.queryOptions());
  const { data: looseByCategory = [] } = useQuery(
    trpc.projects.listLooseTaskCountsByCategory.queryOptions()
  );
  const { data: estimateSampleCount = 0 } = useQuery(
    trpc.projects.estimateSampleCount.queryOptions()
  );

  const [formOpen, setFormOpen] = useState(false);
  const [indexView, setIndexView] = useState<IndexViewMode>("gallery");
  const [templateSuggestId, setTemplateSuggestId] = useState<string | null>(null);

  const hasProjects = (projects?.length ?? 0) > 0;
  const looseCountByCategory = useMemo(
    () => new Map(looseByCategory.map((row) => [row.category, row.count])),
    [looseByCategory]
  );

  const projectsByCategory = useMemo(() => {
    const map = new Map<ProjectCategory, ProjectListItem[]>();
    for (const category of PROJECT_CATEGORIES) {
      map.set(category, []);
    }
    for (const project of projects ?? []) {
      const list = map.get(project.category) ?? [];
      list.push(project);
      map.set(project.category, list);
    }
    return map;
  }, [projects]);

  const allVisible = useMemo(() => projects ?? [], [projects]);
  const { activeProjects, completedProjects, foldingId } = useProjectFoldTransitions(allVisible);

  const activeByCategory = useMemo(() => {
    const activeIds = new Set(activeProjects.map((p) => p.id));
    const map = new Map<ProjectCategory, ProjectListItem[]>();
    for (const category of PROJECT_CATEGORIES) {
      map.set(
        category,
        (projectsByCategory.get(category) ?? []).filter((p) => activeIds.has(p.id))
      );
    }
    return map;
  }, [activeProjects, projectsByCategory]);

  const templateSuggestProject = useMemo(() => {
    if (!templateSuggestId) return null;
    return allVisible.find((p) => p.id === templateSuggestId) ?? null;
  }, [templateSuggestId, allVisible]);

  useEffect(() => {
    if (!foldingId) return;
    const timer = window.setTimeout(
      () => setTemplateSuggestId(foldingId),
      readMotionDurationMs(MOTION_TOKEN.medium)
    );
    return () => window.clearTimeout(timer);
  }, [foldingId]);

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
        {!formOpen ? (
          <Button type="button" onClick={() => setFormOpen(true)}>
            New project
          </Button>
        ) : null}
      </div>

      {formOpen ? (
        <NewProjectForm onCreated={() => setFormOpen(false)} onCancel={() => setFormOpen(false)} />
      ) : null}

      {indexView === "calendar" ? (
        <MultiProjectCalendarView />
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
      ) : !hasProjects && looseByCategory.length === 0 ? (
        <ColoredEmptyInvitation
          title="Start your first project"
          hint="Phases and tasks live here — capture structure as you go."
          action={
            !formOpen ? (
              <Button type="button" onClick={() => setFormOpen(true)}>
                New project
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          {templateSuggestProject ? (
            <ProjectTemplateSuggestChip
              projectId={templateSuggestProject.id}
              projectName={templateSuggestProject.name}
              onDismiss={() => setTemplateSuggestId(null)}
            />
          ) : null}

          <div className="flex flex-col gap-8">
            {PROJECT_CATEGORIES.map((category) => {
              const categoryProjects = activeByCategory.get(category) ?? [];
              const looseCount = looseCountByCategory.get(category) ?? 0;
              const isEmpty = categoryProjects.length === 0 && looseCount === 0;

              if (isEmpty) {
                return (
                  <section key={category} aria-label={categoryLabel(category)}>
                    <header className="mb-3 flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: categorySolidVar(category) }}
                        aria-hidden
                      />
                      <h2 className="text-sm font-medium text-ink">{categoryLabel(category)}</h2>
                    </header>
                    <ColoredEmptyInvitation
                      title={`No ${categoryLabel(category).toLowerCase()} projects yet`}
                      hint="Create a project in this life area when you're ready."
                      className="py-8"
                    />
                  </section>
                );
              }

              return (
                <section key={category} aria-label={categoryLabel(category)}>
                  <header className="mb-3 flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: categorySolidVar(category) }}
                      aria-hidden
                    />
                    <h2 className="text-sm font-medium text-ink">{categoryLabel(category)}</h2>
                  </header>
                  <div className="flex flex-col gap-2">
                    {looseCount > 0 ? (
                      <LooseTasksRow category={category} count={looseCount} />
                    ) : null}
                    {categoryProjects.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {categoryProjects.map((project) => (
                          <ProjectCard
                            key={project.id}
                            project={project}
                            folding={foldingId === project.id}
                            estimateSampleCount={estimateSampleCount}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>

          <CompletedProjectsSection projects={completedProjects} />
        </>
      )}
    </section>
  );
}

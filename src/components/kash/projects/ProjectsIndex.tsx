"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { useTRPC } from "@/trpc/client";

import Button from "@/components/kash/ui/Button";
import { readMotionDurationMs, MOTION_TOKEN } from "@/lib/animate/motion-tokens";

import { InPageSwitcher } from "../InPageSwitcher";
import CategoryFilter, { type CategoryFilterValue } from "./CategoryFilter";
import CompletedProjectsSection from "./CompletedProjectsSection";
import MultiProjectCalendarView from "./MultiProjectCalendarView";
import NewProjectForm from "./NewProjectForm";
import ProjectCard from "./ProjectCard";
import { ProjectTemplateSuggestChip } from "./ProjectTemplateSuggestChip";
import { useProjectFoldTransitions } from "./useProjectFoldTransitions";

type IndexViewMode = "gallery" | "calendar";

export default function ProjectsIndex() {
  const trpc = useTRPC();
  const { data: projects, isLoading } = useQuery(trpc.projects.list.queryOptions());

  const [filter, setFilter] = useState<CategoryFilterValue>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [indexView, setIndexView] = useState<IndexViewMode>("gallery");
  const [templateSuggestId, setTemplateSuggestId] = useState<string | null>(null);

  const hasProjects = (projects?.length ?? 0) > 0;

  const visible = useMemo(() => {
    if (!projects) return [];
    if (filter === "all") return projects;
    return projects.filter((p) => p.category === filter);
  }, [projects, filter]);

  const { activeProjects, completedProjects, foldingId } = useProjectFoldTransitions(visible);

  const templateSuggestProject = useMemo(() => {
    if (!templateSuggestId) return null;
    return visible.find((p) => p.id === templateSuggestId) ?? null;
  }, [templateSuggestId, visible]);

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

      {indexView === "gallery" && hasProjects ? (
        <CategoryFilter value={filter} onChange={setFilter} />
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
      ) : !hasProjects ? (
        <div className="flex flex-col items-center gap-2 rounded-card border border-subtle bg-surface px-6 py-12 text-center">
          <p className="font-medium text-ink">No projects yet</p>
          <p className="text-sm text-ink-muted">
            Create your first project to start planning phases and tasks.
          </p>
          {!formOpen ? (
            <Button type="button" className="mt-2" onClick={() => setFormOpen(true)}>
              New project
            </Button>
          ) : null}
        </div>
      ) : visible.length === 0 ? (
        <p className="text-ink-muted">No projects in this category.</p>
      ) : (
        <>
          {templateSuggestProject ? (
            <ProjectTemplateSuggestChip
              projectId={templateSuggestProject.id}
              projectName={templateSuggestProject.name}
              onDismiss={() => setTemplateSuggestId(null)}
            />
          ) : null}
          {activeProjects.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  folding={foldingId === project.id}
                />
              ))}
            </div>
          ) : (
            <p className="text-ink-muted">No active projects in this category.</p>
          )}
          <CompletedProjectsSection projects={completedProjects} />
        </>
      )}
    </section>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { useTRPC } from "@/trpc/client";

import Button from "@/components/kash/ui/Button";

import CategoryFilter, { type CategoryFilterValue } from "./CategoryFilter";
import CompletedProjectsSection from "./CompletedProjectsSection";
import NewProjectForm from "./NewProjectForm";
import ProjectCard from "./ProjectCard";
import { useProjectFoldTransitions } from "./useProjectFoldTransitions";

export default function ProjectsIndex() {
  const trpc = useTRPC();
  const { data: projects, isLoading } = useQuery(trpc.projects.list.queryOptions());

  const [filter, setFilter] = useState<CategoryFilterValue>("all");
  const [formOpen, setFormOpen] = useState(false);

  const hasProjects = (projects?.length ?? 0) > 0;

  const visible = useMemo(() => {
    if (!projects) return [];
    if (filter === "all") return projects;
    return projects.filter((p) => p.category === filter);
  }, [projects, filter]);

  const { activeProjects, completedProjects, foldingId } = useProjectFoldTransitions(visible);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-ink">Projects</h1>
        {!formOpen ? (
          <Button type="button" onClick={() => setFormOpen(true)}>
            New project
          </Button>
        ) : null}
      </div>

      {formOpen ? (
        <NewProjectForm onCreated={() => setFormOpen(false)} onCancel={() => setFormOpen(false)} />
      ) : null}

      {hasProjects ? <CategoryFilter value={filter} onChange={setFilter} /> : null}

      {isLoading ? (
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

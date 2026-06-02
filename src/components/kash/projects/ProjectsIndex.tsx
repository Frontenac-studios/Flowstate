"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { useTRPC } from "@/trpc/client";

import CategoryFilter, { type CategoryFilterValue } from "./CategoryFilter";
import NewProjectForm from "./NewProjectForm";
import ProjectCard from "./ProjectCard";

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

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-kash-ink">Projects</h1>
        {!formOpen ? (
          <button type="button" className="glass-btn-primary" onClick={() => setFormOpen(true)}>
            New project
          </button>
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
              className="glass-panel-opaque h-24 animate-pulse rounded-kash"
              style={{ border: "2px solid var(--kash-glass-border)" }}
            />
          ))}
        </div>
      ) : !hasProjects ? (
        <div className="glass-panel-opaque flex flex-col items-center gap-2 px-6 py-12 text-center">
          <p className="font-medium text-kash-ink">No projects yet</p>
          <p className="text-sm text-kash-ink-muted">
            Create your first project to start planning phases and tasks.
          </p>
          {!formOpen ? (
            <button
              type="button"
              className="glass-btn-primary mt-2"
              onClick={() => setFormOpen(true)}
            >
              New project
            </button>
          ) : null}
        </div>
      ) : visible.length === 0 ? (
        <p className="text-kash-ink-muted">No projects in this category.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </section>
  );
}

"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";

export function ProjectsIndex() {
  const trpc = useTRPC();
  const { data: projects = [], isLoading } = useQuery(trpc.projects.list.queryOptions());

  return (
    <section aria-labelledby="projects-heading">
      <h1
        id="projects-heading"
        className="mb-3 text-sm font-medium uppercase tracking-wide text-kash-ink-muted"
      >
        Projects
        {projects.length > 0 ? (
          <span className="ml-2 font-normal normal-case text-kash-ink-muted">
            ({projects.length})
          </span>
        ) : null}
      </h1>

      {isLoading ? (
        <p className="glass-panel px-4 py-8 text-center text-sm text-kash-ink-muted">Loading…</p>
      ) : projects.length === 0 ? (
        <div className="glass-panel px-4 py-10 text-center">
          <p className="text-sm text-kash-ink">No projects yet.</p>
          <p className="mt-1 text-xs text-kash-ink-muted">
            Tag a task with <code className="text-kash-ink">#slug</code> in the composer to create
            one.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}`}
                className="glass-panel-opaque flex min-h-kash-row items-center gap-2 px-4 py-3 transition hover:ring-2 hover:ring-[var(--kash-accent-soft)]"
              >
                <span className="min-w-0 flex-1 truncate font-medium text-kash-ink">
                  {project.name}
                </span>
                <span className="shrink-0 text-xs text-kash-ink-muted">#{project.slug}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

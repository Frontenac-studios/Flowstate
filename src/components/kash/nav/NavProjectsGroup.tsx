"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { navProjects } from "@/lib/nav/nav-projects";
import { projectSolidVar } from "@/lib/projects/project-hue";
import { useTRPC } from "@/trpc/client";

type Props = {
  expanded: boolean;
  pathname: string;
};

/**
 * Spec v2/v5 nav: a "Projects" group of live projects — an 8px colour dot, the name
 * and the open-task count. Collapsed, the rail shows the dots alone.
 */
export function NavProjectsGroup({ expanded, pathname }: Props) {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.projects.list.queryOptions());
  const projects = navProjects(data ?? []);
  if (projects.length === 0) return null;

  return (
    <div className="flex min-h-0 flex-col">
      <div className="px-1 pb-2 pt-5">
        {expanded ? (
          <span className="whitespace-nowrap px-2 text-micro font-semibold uppercase tracking-caps text-ink-muted">
            Projects
          </span>
        ) : (
          <div className="mx-2 h-px bg-menu-divider" />
        )}
      </div>
      <ul className="flex min-h-0 flex-col gap-0.5 overflow-y-auto" aria-label="Projects">
        {projects.map((project) => {
          const href = `/projects/${project.id}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={project.id}>
              <Link
                href={href}
                title={project.name}
                aria-current={active ? "page" : undefined}
                className={`kash-focus-row flex h-9 items-center rounded-row outline-none transition-colors motion-reduce:transition-none ${
                  expanded ? "gap-2.5 px-3" : "justify-center"
                } ${active ? "bg-active-surface font-semibold text-ink" : "text-ink hover:bg-tint-hover"}`}
              >
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-pill"
                  style={{ backgroundColor: projectSolidVar(project) }}
                />
                {expanded ? (
                  <>
                    <span className="min-w-0 flex-1 truncate text-[14px]">{project.name}</span>
                    <span className="shrink-0 text-caption tabular-nums text-ink-muted">
                      {project.openCount}
                    </span>
                  </>
                ) : (
                  <span className="sr-only">{project.name}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

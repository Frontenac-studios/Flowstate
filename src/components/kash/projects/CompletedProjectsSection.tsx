"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { ChevronRight, kashIconProps } from "@/components/kash/ui/icon";
import { categorySolidVar } from "@/lib/projects/category-tokens";
import { type ProjectCategory } from "@/lib/projects/categories";

import { ProjectTemplateSuggestSlot } from "./ProjectTemplateSuggestSlot";

export type CompletedProjectRow = {
  id: string;
  name: string;
  slug: string;
  category: ProjectCategory;
};

export default function CompletedProjectsSection({
  projects,
}: {
  projects: CompletedProjectRow[];
}) {
  const headingId = useId();
  const panelId = useId();
  const [collapsed, setCollapsed] = useState(true);

  if (!projects.length) return null;

  const expanded = !collapsed;

  return (
    <section className="mt-6" aria-labelledby={headingId}>
      <button
        type="button"
        className="kash-focus-visible flex w-full items-center gap-2 rounded-card px-1 py-1 text-left outline-none"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setCollapsed((value) => !value)}
      >
        <ChevronRight
          {...kashIconProps({
            tokenSize: "sm",
            className: `text-ink-faint transition-transform duration-short ease-enter motion-reduce:transition-none ${
              expanded ? "rotate-90" : ""
            }`,
          })}
          aria-hidden
        />
        <span id={headingId} className="text-sm font-medium uppercase tracking-wide text-ink-muted">
          Completed
        </span>
        <span className="text-sm text-ink-faint">· {projects.length}</span>
      </button>
      <ul id={panelId} hidden={!expanded} className="mt-3 space-y-2">
        {projects.map((project) => (
          <li key={project.id}>
            <ProjectTemplateSuggestSlot
              projectId={project.id}
              projectName={project.name}
              category={project.category}
              isComplete
            >
              <Link
                href={`/projects/${project.id}`}
                className="kash-focus-visible flex min-h-[var(--row-min-height)] items-center gap-2 rounded-card border border-subtle bg-surface px-3 py-[var(--row-py)] text-sm text-ink-muted outline-none transition hover:bg-surface-2"
              >
                <span
                  className="h-3 shrink-0 rounded-full"
                  style={{
                    width: "var(--stripe-width)",
                    backgroundColor: categorySolidVar(project.category),
                  }}
                  aria-hidden
                />
                <span className="min-w-0 truncate">
                  Completed · <span className="text-ink">{project.name}</span>
                </span>
              </Link>
            </ProjectTemplateSuggestSlot>
          </li>
        ))}
      </ul>
    </section>
  );
}

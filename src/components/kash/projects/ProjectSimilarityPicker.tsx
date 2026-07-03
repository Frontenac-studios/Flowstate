"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import {
  categoryFillVar,
  categorySeedLabel,
  categorySolidVar,
  categoryTextVar,
} from "@/lib/projects/category-tokens";
import type { ProjectCategory } from "@/lib/projects/categories";
import { embedText } from "@/lib/tasks/embed-text";
import { useTRPC } from "@/trpc/client";

type Props = {
  /** Live project name for MiniLM ranking (create flow). */
  liveName?: string;
  /** Exclude the current project (complete flow). */
  excludeProjectId?: string;
  preferredCategory?: ProjectCategory | null;
  selectedId: string | null;
  onSelect: (projectId: string | null) => void;
  compact?: boolean;
};

/**
 * "Like this past one" picker (§5 P2). Surfaces MiniLM-ranked suggestions when a
 * name embedding is available; always lists past projects for manual tagging.
 */
export function ProjectSimilarityPicker({
  liveName = "",
  excludeProjectId,
  preferredCategory = null,
  selectedId,
  onSelect,
  compact = false,
}: Props) {
  const trpc = useTRPC();
  const [embedding, setEmbedding] = useState<number[] | undefined>(undefined);

  useEffect(() => {
    const trimmed = liveName.trim();
    if (trimmed.length < 2) {
      setEmbedding(undefined);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void embedText(trimmed)
        .then((vector) => {
          if (!cancelled) setEmbedding(vector.length > 0 ? vector : undefined);
        })
        .catch(() => {
          if (!cancelled) setEmbedding(undefined);
        });
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [liveName]);

  const { data: candidates = [], isLoading } = useQuery({
    ...trpc.projects.listSimilarCandidates.queryOptions({
      excludeProjectId,
      embedding,
      preferredCategory,
    }),
  });

  const suggested = useMemo(
    () => candidates.filter((row) => row.suggested).slice(0, 3),
    [candidates]
  );
  const rest = useMemo(() => {
    const suggestedIds = new Set(suggested.map((row) => row.id));
    return candidates.filter((row) => !suggestedIds.has(row.id));
  }, [candidates, suggested]);

  if (!isLoading && candidates.length === 0) return null;

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className={`mb-1 font-medium text-ink ${compact ? "text-caption" : "text-sm"}`}>
        Like this past one <span className="font-normal text-ink-muted">(optional)</span>
      </legend>

      {isLoading ? (
        <p className="text-caption text-ink-muted">Loading past projects…</p>
      ) : (
        <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
          {selectedId ? (
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="self-start text-caption text-ink-muted underline-offset-2 hover:underline"
            >
              Clear selection
            </button>
          ) : null}

          {suggested.length > 0 ? <p className="text-caption text-ink-muted">Suggested</p> : null}
          {suggested.map((project) => (
            <SimilarityOption
              key={project.id}
              project={project}
              selected={selectedId === project.id}
              onSelect={onSelect}
              badge="suggested"
            />
          ))}

          {rest.length > 0 && suggested.length > 0 ? (
            <p className="mt-1 text-caption text-ink-muted">All projects</p>
          ) : null}
          {rest.map((project) => (
            <SimilarityOption
              key={project.id}
              project={project}
              selected={selectedId === project.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </fieldset>
  );
}

function SimilarityOption({
  project,
  selected,
  onSelect,
  badge,
}: {
  project: {
    id: string;
    name: string;
    category: ProjectCategory;
    suggested: boolean;
  };
  selected: boolean;
  onSelect: (id: string | null) => void;
  badge?: "suggested";
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(selected ? null : project.id)}
      aria-pressed={selected}
      className={`flex items-center gap-2 rounded-control border px-3 py-2 text-left text-sm transition focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)] ${
        selected
          ? "border-ink bg-surface-2 text-ink"
          : "border-subtle text-ink-muted hover:text-ink"
      }`}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{
          backgroundColor: categorySolidVar(project.category),
          boxShadow: "0 0 0 1px var(--mark-ring)",
        }}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-ink">{project.name}</span>
        <span className="mt-0.5 inline-flex items-center gap-1 text-caption">
          <span
            className="rounded-chip px-1.5 py-0.5"
            style={{
              backgroundColor: categoryFillVar(project.category),
              color: categoryTextVar(project.category),
            }}
          >
            {categorySeedLabel(project.category)}
          </span>
          {badge === "suggested" ? <span className="text-ink-muted">· similar name</span> : null}
        </span>
      </span>
    </button>
  );
}

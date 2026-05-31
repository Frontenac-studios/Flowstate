"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useTRPC } from "@/trpc/client";

import CategoryBadge from "./CategoryBadge";
import type { ProjectDetail, ProjectViewMode } from "./types";

type Props = {
  project: ProjectDetail;
  viewMode: ProjectViewMode;
  onViewModeChange: (mode: ProjectViewMode) => void;
};

const VIEW_MODES: { value: ProjectViewMode; label: string }[] = [
  { value: "columns", label: "Columns" },
  { value: "calendar", label: "Calendar" },
];

export default function ProjectWorkspaceHeader({ project, viewMode, onViewModeChange }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(project.description ?? "");

  // Keep the draft in sync if the project data refreshes while not editing.
  useEffect(() => {
    if (!editing) setDraft(project.description ?? "");
  }, [project.description, editing]);

  const updateMutation = useMutation(
    trpc.projects.update.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.projects.getById.queryKey({ id: project.id }),
        });
        void queryClient.invalidateQueries({ queryKey: trpc.projects.list.queryKey() });
        setEditing(false);
      },
    })
  );

  const saveDescription = () => {
    const next = draft.trim();
    if (next === (project.description ?? "")) {
      setEditing(false);
      return;
    }
    updateMutation.mutate({ id: project.id, description: next || null });
  };

  return (
    <header className="glass-panel-strong flex flex-col gap-3 px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-kash-ink">{project.name}</h1>
          <CategoryBadge category={project.category} />
        </div>

        <div className="glass-pill flex text-sm" role="group" aria-label="View mode">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => onViewModeChange(mode.value)}
              aria-pressed={viewMode === mode.value}
              className={`rounded-full px-3 py-1 transition ${
                viewMode === mode.value
                  ? "bg-kash-accent text-white"
                  : "text-kash-ink-muted hover:text-kash-ink"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea
            className="glass-input glass-textarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Describe this project…"
            maxLength={2000}
            rows={2}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="glass-btn-primary"
              onClick={saveDescription}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className="glass-btn-ghost"
              onClick={() => {
                setDraft(project.description ?? "");
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-left text-sm text-kash-ink-muted transition hover:text-kash-ink"
        >
          {project.description ? project.description : "Add a description…"}
        </button>
      )}
    </header>
  );
}

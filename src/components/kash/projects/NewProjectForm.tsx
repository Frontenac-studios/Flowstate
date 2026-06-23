"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  PROJECT_CATEGORIES,
  PROJECT_CATEGORY_META,
  type ProjectCategory,
} from "@/lib/projects/categories";
import { useTRPC } from "@/trpc/client";

type Props = {
  onCreated: (projectId: string) => void;
  onCancel: () => void;
};

export default function NewProjectForm({ onCreated, onCancel }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<ProjectCategory | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: (project) => {
        void queryClient.invalidateQueries({ queryKey: trpc.projects.list.queryKey() });
        onCreated(project.id);
      },
      onError: (err) => {
        setError(
          err.data?.code === "CONFLICT"
            ? "A project with that name already exists."
            : "Couldn't create the project. Please try again."
        );
      },
    })
  );

  const trimmedName = name.trim();
  const canSubmit = trimmedName.length > 0 && category !== null && !createMutation.isPending;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || category === null) return;
    setError(null);
    createMutation.mutate({
      name: trimmedName,
      category,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="glass-panel flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="new-project-name" className="text-sm font-medium text-kash-ink">
          Name
        </label>
        <input
          id="new-project-name"
          className="glass-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Q3 Marketing Refresh"
          maxLength={120}
          autoFocus
        />
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1 text-sm font-medium text-kash-ink">
          Category <span className="text-kash-ink-muted">(required)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {PROJECT_CATEGORIES.map((value) => {
            const meta = PROJECT_CATEGORY_META[value];
            const selected = category === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                aria-pressed={selected}
                className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition"
                style={
                  selected
                    ? { backgroundColor: meta.color, borderColor: meta.color, color: "#fff" }
                    : {
                        backgroundColor: `${meta.color}1f`,
                        borderColor: "transparent",
                        color: meta.color,
                      }
                }
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: selected ? "#fff" : meta.color }}
                  aria-hidden
                />
                {meta.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {error ? (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <button type="submit" className="glass-btn-primary" disabled={!canSubmit}>
          {createMutation.isPending ? "Creating…" : "Create project"}
        </button>
        <button type="button" className="glass-btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

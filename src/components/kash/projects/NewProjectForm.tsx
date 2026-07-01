"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import Button from "@/components/kash/ui/Button";
import Input from "@/components/kash/ui/Input";
import { InPageSwitcher } from "@/components/kash/InPageSwitcher";
import {
  categoryFillVar,
  categorySeedLabel,
  categorySolidVar,
  categoryTextVar,
} from "@/lib/projects/category-tokens";
import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";
import { useTRPC } from "@/trpc/client";

type Props = {
  onCreated: (projectId: string) => void;
  onCancel: () => void;
};

type CreationMode = "blank" | "template";

const CREATION_MODES: { value: CreationMode; label: string }[] = [
  { value: "blank", label: "Blank" },
  { value: "template", label: "From template" },
];

export default function NewProjectForm({ onCreated, onCancel }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<CreationMode>("blank");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ProjectCategory | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: templates, isLoading: templatesLoading } = useQuery({
    ...trpc.projects.listTemplates.queryOptions(),
    enabled: mode === "template",
  });

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

  const createFromTemplateMutation = useMutation(
    trpc.projects.createFromTemplate.mutationOptions({
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

  const selectedTemplate = templates?.find((template) => template.id === templateId) ?? null;
  const pending = createMutation.isPending || createFromTemplateMutation.isPending;

  useEffect(() => {
    if (mode !== "template" || !selectedTemplate || category !== null) return;
    setCategory(selectedTemplate.category);
  }, [mode, selectedTemplate, category]);

  const trimmedName = name.trim();
  const canSubmitBlank = trimmedName.length > 0 && category !== null && !pending;
  const canSubmitTemplate =
    trimmedName.length > 0 && category !== null && templateId !== null && !pending;
  const canSubmit = mode === "blank" ? canSubmitBlank : canSubmitTemplate;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || category === null) return;
    setError(null);

    if (mode === "blank") {
      createMutation.mutate({
        name: trimmedName,
        category,
      });
      return;
    }

    if (templateId === null) return;
    createFromTemplateMutation.mutate({
      templateId,
      name: trimmedName,
      category,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-card border border-subtle bg-surface p-4"
    >
      <InPageSwitcher
        options={CREATION_MODES}
        value={mode}
        onChange={setMode}
        ariaLabel="New project mode"
      />

      {mode === "template" ? (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 text-sm font-medium text-ink">Template</legend>
          {templatesLoading ? (
            <p className="text-sm text-ink-muted">Loading templates…</p>
          ) : (templates?.length ?? 0) === 0 ? (
            <p className="text-sm text-ink-muted">
              No templates yet. Save one from a project&apos;s menu.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {templates?.map((template) => {
                const selected = templateId === template.id;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => {
                      setTemplateId(template.id);
                      setCategory(template.category);
                    }}
                    aria-pressed={selected}
                    className={`rounded-control border px-3 py-2 text-left text-sm transition focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)] ${
                      selected
                        ? "border-ink bg-surface-2 text-ink"
                        : "border-subtle text-ink-muted hover:text-ink"
                    }`}
                  >
                    <span className="font-medium text-ink">{template.name}</span>
                    <span className="mt-0.5 block text-caption text-ink-muted">
                      {template.phaseCount} phases · {template.taskCount} tasks
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="new-project-name" className="text-sm font-medium text-ink">
          Name
        </label>
        <Input
          id="new-project-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Q3 Marketing Refresh"
          maxLength={120}
          autoFocus
        />
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1 text-sm font-medium text-ink">
          Category <span className="text-ink-muted">(required)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {PROJECT_CATEGORIES.map((value) => {
            const selected = category === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                aria-pressed={selected}
                className={`flex items-center gap-1.5 rounded-chip border px-3 py-1 text-sm font-medium transition focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)] ${
                  selected ? "border-transparent" : "border-subtle text-ink-muted hover:text-ink"
                }`}
                style={
                  selected
                    ? {
                        backgroundColor: categoryFillVar(value),
                        color: categoryTextVar(value),
                      }
                    : undefined
                }
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: categorySolidVar(value),
                    boxShadow: "0 0 0 1px var(--mark-ring)",
                  }}
                  aria-hidden
                />
                {categorySeedLabel(value)}
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
        <Button type="submit" disabled={!canSubmit}>
          {pending ? "Creating…" : "Create project"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

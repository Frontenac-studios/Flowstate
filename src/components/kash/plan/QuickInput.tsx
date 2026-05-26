"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";

import { parseQuickInput } from "@/lib/parser/parse-quick-input";
import { slugifyProjectName } from "@/lib/projects/slugify";
import { useTRPC } from "@/trpc/client";

import { ParsePreviewChips } from "./ParsePreviewChips";

export type QuickInputHandle = {
  focus: () => void;
};

type Props = {
  onTaskCreated?: () => void;
};

export const QuickInput = forwardRef<QuickInputHandle, Props>(function QuickInput(
  { onTaskCreated },
  ref
) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  const { data: projects = [] } = useQuery(trpc.projects.list.queryOptions());

  const parse = parseQuickInput(value, {
    projects: projects.map((p) => ({ slug: p.slug, name: p.name })),
  });

  const projectWarning = parse.warnings.find((w) => w.code === "project_not_found");
  const matchedProject = parse.projectSlug
    ? projects.find((p) => p.slug === parse.projectSlug)
    : null;

  const invalidateToday = () => {
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listToday.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.projects.list.queryKey() });
  };

  const createTaskMutation = useMutation(
    trpc.tasks.create.mutationOptions({
      onSuccess: () => {
        setValue("");
        invalidateToday();
        onTaskCreated?.();
      },
    })
  );

  const createProjectMutation = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: invalidateToday,
    })
  );

  const submitTask = async (projectId: string | null) => {
    await createTaskMutation.mutateAsync({
      title: parse.title,
      scheduledDate: parse.scheduledDate,
      bucketOverride: parse.bucketOverride,
      projectId,
      priority: parse.priority,
    });
  };

  const handleSubmit = async () => {
    if (!value.trim() || createTaskMutation.isPending) return;

    if (projectWarning && !matchedProject) return;

    const projectId = matchedProject?.id ?? null;
    await submitTask(projectId);
  };

  const handleCreateProject = async () => {
    if (!projectWarning) return;
    setCreatingProject(true);
    try {
      const slug = projectWarning.slug;
      const name = slug.replace(/-/g, " ");
      const created = await createProjectMutation.mutateAsync({ name, slug });
      await submitTask(created.id);
    } finally {
      setCreatingProject(false);
    }
  };

  return (
    <section className="glass-panel-opaque p-4">
      <label htmlFor="kash-quick-input" className="sr-only">
        Add a task
      </label>
      <input
        id="kash-quick-input"
        ref={inputRef}
        type="text"
        className="glass-input w-full"
        placeholder="add a task — try 'review PR tomorrow #rdm !!'"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void handleSubmit();
          }
        }}
        autoComplete="off"
        spellCheck={false}
      />

      {value.trim() ? <ParsePreviewChips parse={parse} /> : null}

      {projectWarning && !matchedProject ? (
        <div className="mt-3 space-y-2 text-sm" role="alert">
          <p className="text-red-600">
            No project <span className="font-mono">#{projectWarning.slug}</span>
          </p>
          {parse.suggestions.length > 0 ? (
            <p className="text-kash-ink-muted">
              Did you mean{" "}
              {parse.suggestions.map((s, i) => (
                <span key={s.slug}>
                  {i > 0 ? ", " : ""}
                  <button
                    type="button"
                    className="glass-link font-medium"
                    onClick={() => {
                      const slug = s.slug;
                      setValue((v) =>
                        v.replace(new RegExp(`#${projectWarning.slug}\\b`, "i"), `#${slug}`)
                      );
                    }}
                  >
                    #{s.slug}
                  </button>
                </span>
              ))}
              ?
            </p>
          ) : null}
          <button
            type="button"
            className="glass-pill hover:bg-kash-accent-soft px-3 py-1 text-kash-accent transition"
            onClick={() => void handleCreateProject()}
            disabled={creatingProject || createProjectMutation.isPending}
          >
            Create project &ldquo;{slugifyProjectName(projectWarning.slug)}&rdquo;
          </button>
        </div>
      ) : null}
    </section>
  );
});

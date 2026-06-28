"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { categoryLabel, PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";
import { categorySolidVar } from "@/lib/projects/category-tokens";
import { useTRPC } from "@/trpc/client";

import { IdeaIcon, PlusIcon, TaskIcon } from "./icons";

type AbyssType = "idea" | "task";

/**
 * Minimal inline capture — park an idea or task without leaving the List. The full
 * ⌘⇧A quick-capture overlay, chat "park…" tool, and triage Drop wiring land in slice 8A.
 */
export default function AbyssComposer() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [type, setType] = useState<AbyssType>("idea");
  const [category, setCategory] = useState<ProjectCategory | null>(null);

  const createMutation = useMutation(
    trpc.abyss.create.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.abyss.list.queryKey() });
        setTitle("");
        setCategory(null);
      },
    })
  );

  const trimmed = title.trim();
  const canSubmit = trimmed.length > 0 && !createMutation.isPending;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    createMutation.mutate({ title: trimmed, type, category });
  };

  const TypeToggle = ({
    value,
    label,
    icon,
  }: {
    value: AbyssType;
    label: string;
    icon: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={() => setType(value)}
      aria-pressed={type === value}
      className={`rounded-pill flex items-center gap-1.5 px-2.5 py-1 text-meta transition-colors ${
        type === value
          ? "bg-abyss-accent text-abyss-on-accent"
          : "text-abyss-ink-muted hover:text-abyss-ink"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2.5 rounded-card border border-abyss-border bg-abyss-surface p-2.5"
    >
      <div className="flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Park an idea or task in the deep…"
          maxLength={200}
          className="min-w-0 flex-1 bg-transparent text-body text-abyss-ink placeholder:text-abyss-ink-faint focus:outline-none"
          aria-label="New abyss item"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex items-center gap-1 rounded-control bg-abyss-accent px-2.5 py-1.5 text-meta font-medium text-abyss-on-accent disabled:opacity-40"
        >
          <PlusIcon size={14} />
          Park
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-abyss-border pt-2">
        <div className="rounded-pill flex items-center gap-1 bg-abyss-surface-2 p-0.5">
          <TypeToggle value="idea" label="Idea" icon={<IdeaIcon size={13} />} />
          <TypeToggle value="task" label="Task" icon={<TaskIcon size={13} />} />
        </div>

        <span className="mx-0.5 h-4 w-px bg-abyss-border" aria-hidden />

        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setCategory(null)}
            aria-pressed={category === null}
            className={`rounded-pill px-2 py-0.5 text-caption transition-colors ${
              category === null
                ? "bg-abyss-surface-2 text-abyss-ink"
                : "text-abyss-ink-faint hover:text-abyss-ink-muted"
            }`}
          >
            No category
          </button>
          {PROJECT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              aria-pressed={category === cat}
              className={`rounded-pill flex items-center gap-1.5 px-2 py-0.5 text-caption transition-colors ${
                category === cat
                  ? "bg-abyss-surface-2 text-abyss-ink"
                  : "text-abyss-ink-faint hover:text-abyss-ink-muted"
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: categorySolidVar(cat) }}
                aria-hidden
              />
              {categoryLabel(cat)}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}

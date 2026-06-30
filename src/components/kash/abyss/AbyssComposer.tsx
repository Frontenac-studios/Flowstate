"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { categoryLabel, PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";
import { categorySolidVar } from "@/lib/projects/category-tokens";
import { useTRPC } from "@/trpc/client";

import { CloseIcon, HashIcon, IdeaIcon, PlusIcon, TaskIcon } from "./icons";
import { useAbyssEmbedding } from "./useAbyssEmbedding";
import { useAbyssTagSuggest } from "./useAbyssTagSuggest";

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
  const [tags, setTags] = useState<string[]>([]);

  const embedAndStore = useAbyssEmbedding();
  const suggested = useAbyssTagSuggest(title, tags);

  const createMutation = useMutation(
    trpc.abyss.create.mutationOptions({
      onSuccess: (row, variables) => {
        void queryClient.invalidateQueries({ queryKey: trpc.abyss.list.queryKey() });
        // Embed the freshly-parked title client-side; a near-duplicate resurfaces what
        // you already had (§7A).
        void embedAndStore(row.id, variables.title, true);
        setTitle("");
        setCategory(null);
        setTags([]);
      },
    })
  );

  const trimmed = title.trim();
  const canSubmit = trimmed.length > 0 && !createMutation.isPending;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    createMutation.mutate({ title: trimmed, type, category, tags });
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
      className={`flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-meta transition-colors ${
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
        <div className="flex items-center gap-1 rounded-pill bg-abyss-surface-2 p-0.5">
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
              className={`flex items-center gap-1.5 rounded-pill px-2 py-0.5 text-caption transition-colors ${
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

      {tags.length > 0 || suggested.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-abyss-border pt-2">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setTags((current) => current.filter((t) => t !== tag))}
              aria-label={`Remove tag ${tag}`}
              className="flex items-center gap-1 rounded-pill bg-abyss-surface-2 px-2 py-0.5 text-caption text-abyss-ink"
            >
              <HashIcon size={10} className="text-abyss-ink-faint" />
              {tag}
              <CloseIcon size={10} className="text-abyss-ink-faint" />
            </button>
          ))}
          {suggested.length > 0 ? (
            <>
              <span className="text-caption text-abyss-ink-faint">looks like</span>
              {suggested.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setTags((current) => [...current, tag])}
                  className="flex items-center gap-1 rounded-pill border border-dashed border-abyss-border-strong px-2 py-0.5 text-caption text-abyss-ink-muted transition-colors hover:text-abyss-ink"
                >
                  <PlusIcon size={10} />
                  {tag}
                </button>
              ))}
            </>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

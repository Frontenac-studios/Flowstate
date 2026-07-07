"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { ComposerAssistInput } from "@/components/kash/composer/ComposerAssistInput";
import { Hash, Lightbulb, Plus, SquareCheck, X, withKashIcon } from "@/components/kash/ui/icon";
import { useToast } from "@/components/kash/ui/ToastProvider";
import { buildComposerConfig } from "@/lib/parser/composer-assist";
import { parseQuickInput } from "@/lib/parser/parse-quick-input";
import { categoryLabel, PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";
import { categorySolidVar } from "@/lib/projects/category-tokens";
import { useTRPC } from "@/trpc/client";

import "./abyss-motion.css";
import { useAbyssEmbedding } from "./useAbyssEmbedding";
import { useAbyssTagSuggest } from "./useAbyssTagSuggest";

const IdeaIcon = withKashIcon(Lightbulb);
const TaskIcon = withKashIcon(SquareCheck);
const PlusIcon = withKashIcon(Plus);
const HashIcon = withKashIcon(Hash);
const CloseIcon = withKashIcon(X);
const ABYSS_INPUT_FOCUS = "focus:outline-none focus-visible:shadow-[0_0_0_2px_var(--focus-ring)]";
const ABYSS_BTN_FOCUS =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-abyss-accent focus-visible:ring-offset-2 focus-visible:ring-offset-abyss-surface";

type AbyssType = "idea" | "task";

/**
 * Minimal inline capture — park an idea or task without leaving the List. The full
 * ⌘⇧A quick-capture overlay, chat "park…" tool, and triage Drop wiring land in slice 8A.
 */
export default function AbyssComposer() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [type, setType] = useState<AbyssType>("idea");
  const [category, setCategory] = useState<ProjectCategory | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [isSinking, setIsSinking] = useState(false);

  const { data: projects = [] } = useQuery(trpc.projects.list.queryOptions());
  const { data: tagVocabulary = [] } = useQuery(trpc.tasks.listTagVocabulary.queryOptions());

  const projectRefs = useMemo(
    () => projects.map((p) => ({ slug: p.slug, name: p.name })),
    [projects]
  );

  // Backlog items carry only a title, category and tags — expose exactly those
  // composer segments (no project/priority/due, which abyss.create can't store).
  const assistConfig = useMemo(
    () =>
      buildComposerConfig(
        { projects: projectRefs, tagVocabulary },
        { properties: ["title", "category"], projectFallback: false }
      ),
    [projectRefs, tagVocabulary]
  );

  const parsed = useMemo(
    () => parseQuickInput(title, { projects: projectRefs }),
    [title, projectRefs]
  );

  // Merge grammar-parsed category/tags with the chip selections below.
  const effectiveCategory = parsed.category ?? category;
  const effectiveTags = useMemo(
    () => Array.from(new Set([...tags, ...parsed.tags])),
    [tags, parsed.tags]
  );

  const embedAndStore = useAbyssEmbedding();
  const suggested = useAbyssTagSuggest(parsed.title, effectiveTags);

  const createMutation = useMutation(
    trpc.abyss.create.mutationOptions({
      onSuccess: (row, variables) => {
        void queryClient.invalidateQueries({ queryKey: trpc.abyss.list.queryKey() });
        // Embed the freshly-parked title client-side; a near-duplicate resurfaces what
        // you already had (§7A).
        setIsSinking(true);
        window.setTimeout(() => {
          void embedAndStore(row.id, variables.title, true);
          setTitle("");
          setCategory(null);
          setTags([]);
          setIsSinking(false);
        }, 280);
      },
      onError: () => toast({ message: "Couldn't park that. Please try again.", variant: "error" }),
    })
  );

  const cleanTitle = parsed.title.trim();
  const canSubmit = cleanTitle.length > 0 && !createMutation.isPending;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    createMutation.mutate({
      title: cleanTitle,
      type,
      category: effectiveCategory,
      tags: effectiveTags,
    });
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
      className={`flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-meta transition-colors ${ABYSS_BTN_FOCUS} ${
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
      className={`flex flex-col gap-2.5 rounded-card border border-abyss-border bg-abyss-surface p-2.5 shadow-surface ${isSinking ? "abyss-park-sink" : ""}`}
    >
      <div className="flex items-center gap-2">
        <ComposerAssistInput
          value={title}
          onChange={setTitle}
          config={assistConfig}
          placeholder="Park an idea or task in the deep…"
          maxLength={200}
          wrapperClassName="relative block min-w-0 flex-1"
          className={`w-full bg-transparent text-body text-abyss-ink placeholder:text-abyss-ink-faint ${ABYSS_INPUT_FOCUS}`}
          ghostClassName="italic text-abyss-ink-faint"
          aria-label="New abyss item"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className={`flex items-center gap-1 rounded-control bg-abyss-accent px-2.5 py-1.5 text-meta font-medium text-abyss-on-accent disabled:opacity-40 ${ABYSS_BTN_FOCUS}`}
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
            className={`rounded-pill px-2 py-0.5 text-caption transition-colors ${ABYSS_BTN_FOCUS} ${
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
              className={`flex items-center gap-1.5 rounded-pill px-2 py-0.5 text-caption transition-colors ${ABYSS_BTN_FOCUS} ${
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
              className={`flex items-center gap-1 rounded-pill bg-abyss-surface-2 px-2 py-0.5 text-caption text-abyss-ink ${ABYSS_BTN_FOCUS}`}
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

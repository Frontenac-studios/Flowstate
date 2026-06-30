"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { normalizeTag } from "@/lib/abyss/tags";
import { useTRPC } from "@/trpc/client";

import { CloseIcon, HashIcon, PlusIcon } from "./icons";

type Props = {
  item: { id: string; tags: string[] | null; embedding: number[] | null };
  allTags: string[];
  onClose: () => void;
};

/**
 * Tag editor popover (§7A). Add/remove an item's tags: autocomplete the existing tag set
 * (so tags converge rather than fragment), create a new one, or accept a tag suggested
 * from embedding-near neighbours. Suggestions are never auto-applied. Owns `setTags`.
 */
export default function AbyssTagEditor({ item, allTags, onClose }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  const current = useMemo(() => item.tags ?? [], [item.tags]);
  const hasEmbedding = Array.isArray(item.embedding) && item.embedding.length > 0;

  const setTags = useMutation(
    trpc.abyss.setTags.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.abyss.list.queryKey() });
      },
    })
  );

  const suggestions = useQuery({
    ...trpc.abyss.suggestTags.queryOptions({
      embedding: hasEmbedding ? (item.embedding as number[]) : [0],
      exclude: current,
    }),
    enabled: hasEmbedding,
  });

  useEffect(() => {
    inputRef.current?.focus();
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const commit = (tags: string[]) => setTags.mutate({ id: item.id, tags });
  const add = (raw: string) => {
    const tag = normalizeTag(raw);
    setQuery("");
    if (!tag || current.includes(tag)) return;
    commit([...current, tag]);
  };
  const remove = (tag: string) => commit(current.filter((t) => t !== tag));

  const normalizedQuery = normalizeTag(query);
  const matches = useMemo(
    () =>
      allTags
        .filter((t) => !current.includes(t) && (!normalizedQuery || t.includes(normalizedQuery)))
        .slice(0, 6),
    [allTags, current, normalizedQuery]
  );
  const canCreate = normalizedQuery.length > 0 && !allTags.includes(normalizedQuery);
  const suggested = (suggestions.data ?? []).filter((t) => !current.includes(t));

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Edit tags"
      className="absolute right-2 top-9 z-20 w-64 rounded-card border border-abyss-border-strong bg-abyss-surface p-2"
    >
      {current.length > 0 ? (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {current.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => remove(tag)}
              className="flex items-center gap-1 rounded-pill bg-abyss-surface-2 px-2 py-0.5 text-caption text-abyss-ink transition-colors hover:text-abyss-ink-muted"
              aria-label={`Remove tag ${tag}`}
            >
              <HashIcon size={10} className="text-abyss-ink-faint" />
              {tag}
              <CloseIcon size={10} className="text-abyss-ink-faint" />
            </button>
          ))}
        </div>
      ) : null}

      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (normalizedQuery) add(query);
          }
        }}
        placeholder="Tag…"
        maxLength={32}
        className="w-full rounded-control bg-abyss-surface-2 px-2 py-1 text-meta text-abyss-ink placeholder:text-abyss-ink-faint focus:outline-none"
        aria-label="Add a tag"
      />

      {matches.length > 0 || canCreate ? (
        <div className="mt-1 flex flex-col">
          {matches.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => add(tag)}
              className="flex items-center gap-1.5 rounded-control px-2 py-1 text-left text-meta text-abyss-ink transition-colors hover:bg-abyss-surface-2"
            >
              <HashIcon size={11} className="text-abyss-ink-faint" />
              {tag}
            </button>
          ))}
          {canCreate ? (
            <button
              type="button"
              onClick={() => add(query)}
              className="flex items-center gap-1.5 rounded-control px-2 py-1 text-left text-meta text-abyss-ink-muted transition-colors hover:bg-abyss-surface-2"
            >
              <PlusIcon size={11} className="text-abyss-ink-faint" />
              Create “{normalizedQuery}”
            </button>
          ) : null}
        </div>
      ) : null}

      {suggested.length > 0 ? (
        <div className="mt-1.5 border-t border-abyss-border pt-1.5">
          <p className="px-1 pb-1 text-caption text-abyss-ink-faint">looks like</p>
          <div className="flex flex-wrap gap-1 px-1">
            {suggested.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => add(tag)}
                className="flex items-center gap-1 rounded-pill border border-dashed border-abyss-border-strong px-2 py-0.5 text-caption text-abyss-ink-muted transition-colors hover:text-abyss-ink"
              >
                <PlusIcon size={10} />
                {tag}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

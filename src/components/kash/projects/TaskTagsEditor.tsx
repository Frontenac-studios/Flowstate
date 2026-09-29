"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { Hash, X, withKashIcon } from "@/components/kash/ui/icon";
import Input from "@/components/kash/ui/Input";
import { normalizeTaskTag } from "@/lib/tasks/tags";
import { useTRPC } from "@/trpc/client";

const HashIcon = withKashIcon(Hash);
const CloseIcon = withKashIcon(X);

type Props = {
  tags: string[];
  disabled?: boolean;
  onChange: (tags: string[]) => void;
  /** Hide the built-in "Tags" heading when the host already labels the section. */
  hideHeading?: boolean;
};

export default function TaskTagsEditor({
  tags,
  disabled = false,
  onChange,
  hideHeading = false,
}: Props) {
  const trpc = useTRPC();
  const { data: tagVocabulary = [] } = useQuery(trpc.tasks.listTagVocabulary.queryOptions());
  const [draft, setDraft] = useState("");

  const current = useMemo(() => tags ?? [], [tags]);
  const normalizedDraft = normalizeTaskTag(draft);
  const suggestions = useMemo(
    () =>
      tagVocabulary
        .filter(
          (tag) =>
            !current.some((t) => t.toLowerCase() === tag.toLowerCase()) &&
            (!normalizedDraft || tag.toLowerCase().includes(normalizedDraft.toLowerCase()))
        )
        .slice(0, 6),
    [tagVocabulary, current, normalizedDraft]
  );

  const addTag = (raw: string) => {
    const tag = normalizeTaskTag(raw);
    setDraft("");
    if (!tag) return;
    if (current.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
    onChange([...current, tag]);
  };

  const removeTag = (tag: string) => {
    onChange(current.filter((t) => t !== tag));
  };

  return (
    <div className="flex flex-col gap-2">
      {hideHeading ? null : <span className="text-sm font-medium text-ink">Tags</span>}
      {current.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {current.map((tag) => (
            <button
              key={tag}
              type="button"
              disabled={disabled}
              onClick={() => removeTag(tag)}
              className="kash-focus-visible flex h-6 items-center gap-1 rounded-pill bg-active-surface px-2.5 text-caption font-semibold text-ink outline-none transition-colors hover:bg-tint-pressed disabled:opacity-40"
              aria-label={`Remove tag ${tag}`}
            >
              <HashIcon size={10} className="text-ink-muted" />
              {tag}
              <CloseIcon size={10} className="text-ink-muted" />
            </button>
          ))}
        </div>
      ) : (
        <p className="text-meta text-ink-muted">No tags yet — add one below.</p>
      )}

      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addTag(draft);
          }
        }}
        disabled={disabled}
        placeholder="Add tag…"
        maxLength={64}
        aria-label="Add task tag"
      />

      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {suggestions.map((tag) => (
            <button
              key={tag}
              type="button"
              disabled={disabled}
              onClick={() => addTag(tag)}
              className="rounded-pill border border-border px-2 py-0.5 text-xs text-ink-muted transition hover:text-ink disabled:opacity-50"
            >
              {tag}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

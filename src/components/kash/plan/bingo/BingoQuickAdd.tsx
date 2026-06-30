"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import {
  categoryFillVar,
  categorySeedLabel,
  categorySolidVar,
  categoryTextVar,
} from "@/lib/projects/category-tokens";
import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";
import { useTRPC } from "@/trpc/client";

type Props = {
  /** 1-based square number for the prompt (cellIndex + 1). */
  squareLabel: number;
  busy: boolean;
  error: string | null;
  onSubmit: (title: string, category: ProjectCategory, valueId: string | null) => void;
  onCancel: () => void;
};

export default function BingoQuickAdd({ squareLabel, busy, error, onSubmit, onCancel }: Props) {
  const trpc = useTRPC();
  const { data: values = [] } = useQuery(trpc.aboutMe.values.list.queryOptions());

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ProjectCategory | null>(null);
  const [valueId, setValueId] = useState<string | null>(null);

  const trimmed = title.trim();
  const canSubmit = trimmed.length > 0 && category !== null && !busy;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || category === null) return;
    onSubmit(trimmed, category, valueId);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-card border border-subtle bg-surface p-4"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="bingo-goal-title" className="text-caption font-medium text-ink">
          Goal for square {squareLabel}
        </label>
        <input
          id="bingo-goal-title"
          className="rounded-control border border-subtle bg-surface px-3 py-2 text-body text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Run a half marathon"
          maxLength={500}
          autoFocus
        />
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1 text-caption font-medium text-ink">Category</legend>
        <div className="flex flex-wrap gap-2">
          {PROJECT_CATEGORIES.map((value) => {
            const selected = category === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                aria-pressed={selected}
                className={`flex items-center gap-1.5 rounded-chip border px-3 py-1 text-caption font-medium transition ${
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
                  style={{ backgroundColor: categorySolidVar(value) }}
                  aria-hidden
                />
                {categorySeedLabel(value)}
              </button>
            );
          })}
        </div>
      </fieldset>

      {values.length > 0 ? (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 text-caption font-medium text-ink">Value (optional)</legend>
          <div className="flex flex-wrap gap-2">
            {values.map((v) => {
              const selected = valueId === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setValueId(selected ? null : v.id)}
                  aria-pressed={selected}
                  className={`rounded-chip border px-3 py-1 text-caption font-medium transition ${
                    selected
                      ? "border-ink bg-ink text-accent-on"
                      : "border-subtle text-ink-muted hover:text-ink"
                  }`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {error ? (
        <p role="alert" className="text-caption text-critical">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-control border-[1.5px] border-ink px-3 py-1.5 text-caption font-medium text-ink transition hover:bg-surface-2 disabled:opacity-40"
        >
          {busy ? "Adding…" : "Add goal"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-control px-3 py-1.5 text-caption text-ink-muted transition hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

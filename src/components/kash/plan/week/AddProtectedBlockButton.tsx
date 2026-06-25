"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { PROJECT_CATEGORIES, categoryLabel, type ProjectCategory } from "@/lib/projects/categories";
import { useTRPC } from "@/trpc/client";

type Props = {
  isoDate: string;
};

export default function AddProtectedBlockButton({ isoDate }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ProjectCategory>("relationships");

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: trpc.protectedBlocks.listForWeek.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.protectedBlocks.listForDate.queryKey() });
  };

  const createMutation = useMutation(
    trpc.protectedBlocks.create.mutationOptions({
      onSuccess: () => {
        invalidate();
        setOpen(false);
      },
    })
  );

  if (!open) {
    return (
      <button
        type="button"
        className="mt-1 w-full rounded-row border border-dashed border-[var(--border)] px-2 py-1 text-caption text-ink-muted hover:border-[var(--ink-faint)] hover:text-ink"
        onClick={() => setOpen(true)}
      >
        + Protect time
      </button>
    );
  }

  return (
    <form
      className="mt-1 space-y-1.5 rounded-row border border-[var(--border-subtle)] bg-[var(--surface)] p-2"
      onSubmit={(e) => {
        e.preventDefault();
        createMutation.mutate({ category, scheduledDate: isoDate });
      }}
    >
      <label className="block text-caption text-ink-muted">
        Category
        <select
          className="glass-input mt-1 w-full py-1 text-xs"
          value={category}
          onChange={(e) => setCategory(e.target.value as ProjectCategory)}
        >
          {PROJECT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {categoryLabel(c)}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-1">
        <button
          type="submit"
          className="glass-btn-primary flex-1 py-1 text-xs"
          disabled={createMutation.isPending}
        >
          Add
        </button>
        <button
          type="button"
          className="glass-btn-ghost py-1 text-xs"
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

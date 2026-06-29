"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import Button from "@/components/kash/ui/Button";
import Input from "@/components/kash/ui/Input";
import { categoryColor, type ProjectCategory } from "@/lib/projects/categories";
import { MAX_CATEGORY_LABEL_LENGTH } from "@/lib/projects/category-settings";
import { useTRPC } from "@/trpc/client";

// Phase 1 (1E / Q3): labels + sort order only. Color stays with Design Tokens (shown
// here read-only as a swatch) and weekly targets are schema-only until Week/review.
export default function CategorySettingsSection() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(trpc.categorySettings.get.queryOptions());

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: trpc.categorySettings.get.queryKey() });

  const updateMutation = useMutation(
    trpc.categorySettings.update.mutationOptions({ onSuccess: invalidate })
  );
  const reorderMutation = useMutation(
    trpc.categorySettings.reorder.mutationOptions({ onSuccess: invalidate })
  );

  // Label drafts so typing doesn't fight the query cache; seeded from the server view.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!data) return;
    setDrafts(Object.fromEntries(data.map((c) => [c.category, c.label])));
  }, [data]);

  const commitLabel = (category: ProjectCategory, serverLabel: string) => {
    const next = (drafts[category] ?? "").trim();
    if (next === serverLabel.trim()) return;
    updateMutation.mutate({ category, label: next });
  };

  const move = (index: number, direction: -1 | 1) => {
    if (!data || reorderMutation.isPending) return;
    const target = index + direction;
    if (target < 0 || target >= data.length) return;
    const order = data.map((c) => c.category);
    [order[index], order[target]] = [order[target], order[index]];
    reorderMutation.mutate({ order });
  };

  const busy = isLoading || reorderMutation.isPending;

  return (
    <section className="rounded-[var(--radius-row)] border border-subtle bg-surface p-4">
      <h2 className="text-sm font-semibold text-ink">Categories</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Rename your life areas and set the order they appear in. Colors come from the theme.
      </p>
      <ul className="mt-4 space-y-2" aria-busy={busy}>
        {(data ?? []).map((cat, index) => (
          <li
            key={cat.category}
            className="flex items-center gap-3 rounded-[var(--radius-chip)] border border-subtle bg-surface p-3"
          >
            <span
              aria-hidden
              className="h-4 w-4 shrink-0 rounded-full"
              style={{ backgroundColor: categoryColor(cat.category) }}
            />
            <Input
              className="flex-1"
              value={drafts[cat.category] ?? ""}
              maxLength={MAX_CATEGORY_LABEL_LENGTH}
              disabled={updateMutation.isPending}
              aria-label={`Label for ${cat.label}`}
              onChange={(e) => setDrafts((d) => ({ ...d, [cat.category]: e.target.value }))}
              onBlur={() => commitLabel(cat.category, cat.label)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
            />
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                variant="ghost"
                className="px-2 py-1 text-sm disabled:opacity-40"
                onClick={() => move(index, -1)}
                disabled={busy || index === 0}
                aria-label={`Move ${cat.label} up`}
              >
                ↑
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="px-2 py-1 text-sm disabled:opacity-40"
                onClick={() => move(index, 1)}
                disabled={busy || index === (data?.length ?? 0) - 1}
                aria-label={`Move ${cat.label} down`}
              >
                ↓
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {updateMutation.isError || reorderMutation.isError ? (
        <p className="mt-2 text-sm text-critical" role="alert">
          Could not save category settings. Try again.
        </p>
      ) : null}
    </section>
  );
}

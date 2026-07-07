"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

import {
  categorySeedLabel,
  categorySolidVar,
  categoryTextVar,
} from "@/lib/projects/category-tokens";
import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";
import { useTRPC } from "@/trpc/client";

type Props = {
  year: number;
  month: number;
  intentions: Array<{ category: ProjectCategory; text: string }>;
};

export default function MonthIntentionsEditor({ year, month, intentions }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<ProjectCategory, string>>(
    () =>
      Object.fromEntries(
        PROJECT_CATEGORIES.map((category) => [
          category,
          intentions.find((i) => i.category === category)?.text ?? "",
        ])
      ) as Record<ProjectCategory, string>
  );

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        PROJECT_CATEGORIES.map((category) => [
          category,
          intentions.find((i) => i.category === category)?.text ?? "",
        ])
      ) as Record<ProjectCategory, string>
    );
  }, [intentions]);

  const upsertMutation = useMutation(
    trpc.planning.upsertMonthIntention.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.planning.listMonthIntentions.queryKey({ year, month }),
        });
      },
    })
  );

  const persist = useCallback(
    (category: ProjectCategory, text: string) => {
      upsertMutation.mutate({ year, month, category, text });
    },
    [upsertMutation, year, month]
  );

  return (
    <section className="flex flex-col gap-3 rounded-card border border-subtle bg-surface p-4 shadow-surface">
      <h3 className="text-caption font-medium uppercase tracking-wide text-ink-muted">
        Monthly intentions
      </h3>
      <ul className="flex flex-col gap-2">
        {PROJECT_CATEGORIES.map((category) => {
          const value = drafts[category] ?? "";
          return (
            <li key={category} className="flex items-start gap-3">
              <span
                className="mt-2.5 h-4 w-0.5 shrink-0 rounded-full"
                style={{ backgroundColor: categorySolidVar(category) }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <label
                  htmlFor={`intention-${category}`}
                  className="text-caption font-medium"
                  style={{ color: categoryTextVar(category) }}
                >
                  {categorySeedLabel(category)}
                </label>
                <input
                  id={`intention-${category}`}
                  type="text"
                  value={value}
                  placeholder="—"
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [category]: e.target.value }))}
                  onBlur={() => {
                    const saved = intentions.find((i) => i.category === category)?.text ?? "";
                    if (value !== saved) persist(category, value);
                  }}
                  className="mt-0.5 w-full rounded-control border border-subtle bg-surface-2 px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)]"
                  aria-label={`${categorySeedLabel(category)} intention`}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

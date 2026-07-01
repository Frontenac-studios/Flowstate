"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

import {
  categoryFillVar,
  categorySeedLabel,
  categorySolidVar,
  categoryTextVar,
} from "@/lib/projects/category-tokens";
import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";
import { useTRPC } from "@/trpc/client";

type Props = {
  year: number;
  quarter: number;
  phrase: string | null;
  focusCategories: ProjectCategory[];
};

export default function QuarterThemePicker({ year, quarter, phrase, focusCategories }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [draftPhrase, setDraftPhrase] = useState(phrase ?? "");
  const [selected, setSelected] = useState<ProjectCategory[]>(focusCategories);

  useEffect(() => {
    setDraftPhrase(phrase ?? "");
  }, [phrase]);

  useEffect(() => {
    setSelected(focusCategories);
  }, [focusCategories]);

  const upsertMutation = useMutation(
    trpc.planning.upsertQuarterTheme.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.planning.getQuarterTheme.queryKey({
            year,
            quarter: quarter as 1 | 2 | 3 | 4,
          }),
        });
        await queryClient.invalidateQueries({
          queryKey: trpc.planning.listQuarterThemes.queryKey({ year }),
        });
      },
    })
  );

  const persist = useCallback(
    (nextPhrase: string, nextFocus: ProjectCategory[]) => {
      upsertMutation.mutate({
        year,
        quarter: quarter as 1 | 2 | 3 | 4,
        phrase: nextPhrase.trim() || null,
        focusCategories: nextFocus,
      });
    },
    [upsertMutation, year, quarter]
  );

  const toggleCategory = (category: ProjectCategory) => {
    const next = selected.includes(category)
      ? selected.filter((c) => c !== category)
      : [...selected, category];
    setSelected(next);
    persist(draftPhrase, next);
  };

  return (
    <section className="flex flex-col gap-3 rounded-card border border-subtle bg-surface p-4">
      <div className="flex flex-col gap-1">
        <label
          htmlFor={`quarter-theme-${quarter}`}
          className="text-caption font-medium text-ink-muted"
        >
          Quarter theme
        </label>
        <input
          id={`quarter-theme-${quarter}`}
          type="text"
          value={draftPhrase}
          placeholder="Optional phrase — e.g. Build & ship"
          onChange={(e) => setDraftPhrase(e.target.value)}
          onBlur={() => {
            if (draftPhrase !== (phrase ?? "")) persist(draftPhrase, selected);
          }}
          className="rounded-control border border-subtle bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-caption text-ink-muted">Focus categories (optional)</p>
        <div className="flex flex-wrap gap-2">
          {PROJECT_CATEGORIES.map((category) => {
            const active = selected.includes(category);
            return (
              <button
                key={category}
                type="button"
                aria-pressed={active}
                onClick={() => toggleCategory(category)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-caption font-medium transition ${
                  active ? "" : "border-subtle text-ink-muted hover:border-ink-muted"
                }`}
                style={
                  active
                    ? {
                        borderColor: categorySolidVar(category),
                        backgroundColor: categoryFillVar(category),
                        color: categoryTextVar(category),
                      }
                    : undefined
                }
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: categorySolidVar(category) }}
                  aria-hidden
                />
                {categorySeedLabel(category)}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

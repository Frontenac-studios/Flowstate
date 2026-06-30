"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import Button from "@/components/kash/ui/Button";
import Input from "@/components/kash/ui/Input";
import { CURATED_VALUES, VALUE_LABEL_MAX, VALUES_MAX, VALUES_MIN } from "@/lib/about-me/constants";
import { normalizeValueLabel } from "@/lib/about-me/values";
import { useTRPC } from "@/trpc/client";

import SectionSuggestions from "./SectionSuggestions";

export default function ValuesSection() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: values = [], isLoading } = useQuery(trpc.aboutMe.values.list.queryOptions());

  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: trpc.aboutMe.values.list.queryKey() });

  const addMutation = useMutation(
    trpc.aboutMe.values.add.mutationOptions({
      onSuccess: () => {
        setDraft("");
        setError(null);
        invalidate();
      },
      onError: (e) => setError(e.message),
    })
  );

  const removeMutation = useMutation(
    trpc.aboutMe.values.remove.mutationOptions({ onSuccess: invalidate })
  );

  const count = values.length;
  const atMax = count >= VALUES_MAX;
  const belowMin = count < VALUES_MIN;
  const busy = addMutation.isPending || removeMutation.isPending;

  const chosen = new Set(values.map((v) => normalizeValueLabel(v.label)));
  const suggestions = CURATED_VALUES.filter((label) => !chosen.has(normalizeValueLabel(label)));

  const add = (label: string, source: "curated" | "custom") => {
    const trimmed = label.trim();
    if (!trimmed || atMax || busy) return;
    addMutation.mutate({ label: trimmed, source });
  };

  const submitCustom = (e: FormEvent) => {
    e.preventDefault();
    add(draft, "custom");
  };

  return (
    <section id="about-values" className="scroll-mt-24">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-subtitle font-medium text-ink">Values</h3>
        <span className="text-caption text-ink-faint">
          {count} of {VALUES_MIN}–{VALUES_MAX} chosen
        </span>
      </div>
      <p className="mb-3 text-meta text-ink-muted">
        A small set of core values Kash leans on when it plans and suggests with you.
      </p>

      <div className="rounded-card border border-subtle bg-surface p-4">
        {count === 0 ? (
          <p className="text-body text-ink-muted">
            No values yet — add a few from the suggestions below, or write your own.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2" aria-label="Your values">
            {values.map((v) => (
              <li key={v.id}>
                <span className="inline-flex items-center gap-2 rounded-chip border-[1.5px] border-ink px-3 py-1.5 text-body text-ink">
                  {v.label}
                  <button
                    type="button"
                    onClick={() => removeMutation.mutate({ id: v.id })}
                    disabled={busy}
                    aria-label={`Remove ${v.label}`}
                    className="text-ink-faint transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 border-t border-subtle pt-3">
          {atMax ? (
            <p className="text-meta text-ink-muted">
              You&apos;ve reached the {VALUES_MAX}-value max. Remove one to add another.
            </p>
          ) : (
            <>
              {suggestions.length > 0 ? (
                <>
                  <p className="mb-2 text-meta text-ink-muted">Suggestions — tap to add</p>
                  <ul className="mb-3 flex flex-wrap gap-2">
                    {suggestions.map((label) => (
                      <li key={label}>
                        <button
                          type="button"
                          onClick={() => add(label, "curated")}
                          disabled={busy}
                          className="rounded-chip border border-dashed border-border px-3 py-1.5 text-body text-ink-muted transition hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          + {label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              <form onSubmit={submitCustom} className="flex gap-2">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={VALUE_LABEL_MAX}
                  placeholder="Write your own…"
                  aria-label="Write your own value"
                  disabled={busy}
                  className="flex-1 text-body"
                />
                <Button
                  type="submit"
                  disabled={busy || draft.trim().length === 0}
                  className="text-body"
                >
                  Add
                </Button>
              </form>
            </>
          )}

          {error ? (
            <p className="mt-2 text-meta text-critical" role="alert">
              {error}
            </p>
          ) : null}
          {!atMax && belowMin && count > 0 && !error ? (
            <p className="mt-2 text-meta text-ink-faint">
              Add at least {VALUES_MIN} to get started.
            </p>
          ) : null}
        </div>
      </div>

      {isLoading ? <p className="mt-2 text-meta text-ink-faint">Loading…</p> : null}

      <SectionSuggestions section="values" />
    </section>
  );
}

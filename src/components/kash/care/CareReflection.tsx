"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import Button from "@/components/kash/ui/Button";
import Textarea from "@/components/kash/ui/Textarea";
import { useToast } from "@/components/kash/ui/ToastProvider";
import { MOOD_OPTIONS } from "@/lib/care/reflection-prompt";
import { startOfLocalDay, toISODateString } from "@/lib/dates/local-day";
import { useTRPC } from "@/trpc/client";

export function CareReflection() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const todayIso = useMemo(() => toISODateString(startOfLocalDay()), []);

  const promptQuery = useQuery(
    trpc.care.getReflectionPrompt.queryOptions({ reflectionDate: todayIso })
  );
  const savedQuery = useQuery(
    trpc.care.getReflectionForDate.queryOptions({ reflectionDate: todayIso, scope: "daily" })
  );
  const archiveQuery = useQuery(trpc.care.listReflectionArchive.queryOptions({ limit: 10 }));

  const [bodyText, setBodyText] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (savedQuery.data) {
      setBodyText(savedQuery.data.bodyText ?? "");
      setMood(savedQuery.data.mood ?? null);
    }
  }, [savedQuery.data]);

  const saveReflection = useMutation(
    trpc.care.saveReflection.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.care.getReflectionForDate.queryKey({
            reflectionDate: todayIso,
            scope: "daily",
          }),
        });
        void queryClient.invalidateQueries({
          queryKey: trpc.care.listReflectionArchive.queryKey(),
        });
        void queryClient.invalidateQueries({ queryKey: trpc.care.getStatsSummary.queryKey() });
        setSavedNotice(true);
        window.setTimeout(() => setSavedNotice(false), 2500);
      },
      onError: () =>
        toast({ message: "Couldn't save your reflection. Please try again.", variant: "error" }),
    })
  );

  const promptText = savedQuery.data?.promptText ?? promptQuery.data?.promptText ?? "";
  // If the prompt failed to load, the user can still save with a neutral prompt label
  // rather than being locked out of recording tonight's reflection.
  const promptForSave = promptText || "Daily reflection";

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-card border border-subtle bg-surface p-4">
        <h2 className="mb-2 text-caption font-medium text-ink-muted">Tonight&apos;s frame</h2>
        {promptQuery.isLoading ? (
          <p className="text-meta text-ink-faint">Loading…</p>
        ) : promptQuery.isError && !promptText ? (
          <p className="text-meta text-ink-muted">
            Tonight&apos;s frame didn&apos;t load — you can still write and save below.
          </p>
        ) : (
          <div className="flex flex-col gap-2 text-body leading-snug text-ink">
            {promptQuery.data?.frame ? (
              <>
                <p>{promptQuery.data.frame.win}</p>
                <p>{promptQuery.data.frame.drain}</p>
                <p>{promptQuery.data.frame.forward}</p>
              </>
            ) : (
              <p>{promptText}</p>
            )}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-card border border-subtle bg-surface p-4">
        <label htmlFor="care-reflection-body" className="text-caption font-medium text-ink-muted">
          Your reflection
        </label>
        <Textarea
          id="care-reflection-body"
          value={bodyText}
          onChange={(event) => setBodyText(event.target.value)}
          rows={6}
          placeholder="Write as much or as little as feels right…"
          className="min-h-[140px] resize-y"
        />
        <div className="flex flex-wrap gap-2">
          {MOOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMood(mood === option.value ? null : option.value)}
              className={`rounded-chip px-3 py-1.5 text-meta transition-colors ${
                mood === option.value
                  ? "bg-[var(--cat-body-mind-fill)] text-[var(--cat-body-mind-text)]"
                  : "border border-subtle text-ink-muted hover:bg-surface-2"
              }`}
              aria-pressed={mood === option.value}
            >
              <span aria-hidden>{option.emoji}</span> {option.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            disabled={saveReflection.isPending || promptQuery.isLoading}
            onClick={() =>
              saveReflection.mutate({
                reflectionDate: todayIso,
                scope: "daily",
                promptText: promptForSave,
                bodyText: bodyText.trim() ? bodyText.trim() : null,
                mood,
              })
            }
          >
            {saveReflection.isPending ? "Saving…" : "Save reflection"}
          </Button>
          {savedNotice ? <span className="text-meta text-ink-faint">Saved</span> : null}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-subtitle font-medium text-ink">Recent reflections</h2>
        {archiveQuery.isLoading ? (
          <p className="text-meta text-ink-faint">Loading…</p>
        ) : archiveQuery.data?.length === 0 ? (
          <div className="rounded-card border border-subtle bg-surface px-4 py-8 text-center">
            <p className="text-body text-ink-muted">Your archive will grow here.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {archiveQuery.data?.map((entry) => (
              <li key={entry.id} className="rounded-card border border-subtle bg-surface p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h3 className="text-caption font-medium text-ink-muted">
                    {entry.reflectionDate}
                  </h3>
                  {entry.mood ? (
                    <span className="text-meta text-ink-faint">
                      {MOOD_OPTIONS.find((option) => option.value === entry.mood)?.emoji}
                    </span>
                  ) : null}
                </div>
                <p className="line-clamp-3 text-body text-ink">
                  {entry.bodyText?.trim() || "A quiet entry — mood only."}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

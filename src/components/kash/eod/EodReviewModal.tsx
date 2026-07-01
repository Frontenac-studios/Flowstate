"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import {
  isGenerateAttemptedForDate,
  readEodStorage,
  setGenerateAttemptedForDate,
} from "@/lib/eod/eod-storage";
import Button from "@/components/kash/ui/Button";
import Textarea from "@/components/kash/ui/Textarea";
import { templateEodReview } from "@/lib/eod/template-eod-review";
import { renderInlineBold } from "@/lib/markdown/inline-bold";
import { useTRPC } from "@/trpc/client";

import { FocusTimeChart } from "./FocusTimeChart";
import { Top3ReviewSummary } from "./Top3ReviewSummary";

type Props = {
  open: boolean;
  localDate: string;
  tzOffsetMinutes: number;
  onClose: () => void;
  onSnooze: () => void;
  onSkip: () => void;
  onSaved: () => void;
};

export function EodReviewModal({
  open,
  localDate,
  tzOffsetMinutes,
  onClose,
  onSnooze,
  onSkip,
  onSaved,
}: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const dialogRef = useRef<HTMLDivElement>(null);
  /** Calendar day last applied to form state; re-hydrate when localDate changes while modal stays open. */
  const hydratedForDateRef = useRef<string | null>(null);
  const summarySectionId = useId();

  const [summary, setSummary] = useState("");
  const [reflectiveQuestion, setReflectiveQuestion] = useState("");
  const [reflection, setReflection] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: payload, isLoading: payloadLoading } = useQuery({
    ...trpc.dayReviews.getPayload.queryOptions({ localDate, tzOffsetMinutes }),
    enabled: open,
  });

  const generateMutation = useMutation(trpc.dayReviews.generateSummary.mutationOptions());
  const upsertMutation = useMutation(trpc.dayReviews.upsert.mutationOptions());

  const applyTemplate = useCallback(() => {
    if (!payload) return;
    const focusSecondsTotal = payload.focusBars.reduce((s, b) => s + b.seconds, 0);
    const { summary: s, reflectiveQuestion: q } = templateEodReview({
      completionsToday: payload.completionsToday,
      top3Status: payload.top3Status,
      focusSecondsTotal,
      focusTaskCount: payload.focusBars.length + payload.focusOverflowCount,
    });
    setSummary(s);
    setReflectiveQuestion(q);
  }, [payload]);

  const runGenerate = useCallback(async () => {
    if (!payload) return;
    setAiLoading(true);
    try {
      const result = await generateMutation.mutateAsync({ localDate, tzOffsetMinutes });
      setSummary(result.summary);
      setReflectiveQuestion(result.reflectiveQuestion);
    } catch {
      applyTemplate();
    } finally {
      setAiLoading(false);
    }
  }, [applyTemplate, generateMutation, localDate, payload, tzOffsetMinutes]);

  useEffect(() => {
    if (!open) {
      hydratedForDateRef.current = null;
      return;
    }
    if (!payload || payload.localDate !== localDate) return;
    if (hydratedForDateRef.current === localDate) return;
    hydratedForDateRef.current = localDate;
    setSaveError(null);
    setSummary("");
    setReflectiveQuestion("");
    setReflection("");

    const saved = payload.savedReview;
    if (saved?.summary) {
      setSummary(saved.summary);
      setReflection(saved.reflectionText ?? "");
      setReflectiveQuestion(
        saved.reflectiveQuestion ??
          templateEodReview({
            completionsToday: payload.completionsToday,
            top3Status: payload.top3Status,
            focusSecondsTotal: payload.focusBars.reduce((s, b) => s + b.seconds, 0),
            focusTaskCount: payload.focusBars.length + payload.focusOverflowCount,
          }).reflectiveQuestion
      );
      return;
    }

    const storage = readEodStorage();
    if (isGenerateAttemptedForDate(localDate, storage.generateAttemptedForDate)) {
      applyTemplate();
      return;
    }

    setGenerateAttemptedForDate(localDate);
    void runGenerate();
  }, [open, payload, localDate, runGenerate, applyTemplate]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      onSnooze();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onSnooze]);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
  }, [open]);

  const handleRegenerate = () => {
    void runGenerate();
  };

  const handleDone = async () => {
    if (!payload) return;
    setSaveError(null);

    const focusSecondsTotal = payload.focusBars.reduce((s, b) => s + b.seconds, 0);
    const template = templateEodReview({
      completionsToday: payload.completionsToday,
      top3Status: payload.top3Status,
      focusSecondsTotal,
      focusTaskCount: payload.focusBars.length + payload.focusOverflowCount,
    });

    const finalSummary = summary.trim() || template.summary;
    const finalQuestion = reflectiveQuestion.trim() || template.reflectiveQuestion;

    try {
      await upsertMutation.mutateAsync({
        localDate,
        summary: finalSummary,
        top3Status: payload.top3Status,
        reflectiveQuestion: finalQuestion,
        reflectionText: reflection.trim() || null,
      });

      await queryClient.invalidateQueries({
        queryKey: trpc.dayReviews.getPayload.queryKey({ localDate, tzOffsetMinutes }),
      });

      onSaved();
      onClose();
    } catch {
      setSaveError("Couldn't save your review — try again.");
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center p-[var(--space-4)]"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 z-base bg-black/20"
        aria-label="Close review"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="eod-review-title"
        aria-describedby={payload && !payloadLoading ? summarySectionId : undefined}
        tabIndex={-1}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-card border border-subtle bg-surface p-[var(--space-6)]"
      >
        <h2 id="eod-review-title" className="text-title font-semibold text-ink">
          End of day review
        </h2>

        {payloadLoading || !payload ? (
          <p className="mt-[var(--space-4)] text-body text-ink-muted">Loading your day…</p>
        ) : (
          <div id={summarySectionId} className="mt-[var(--space-4)] space-y-[var(--space-5)]">
            <p className="text-body text-ink">
              <span className="font-semibold">{payload.completionsToday}</span> task
              {payload.completionsToday === 1 ? "" : "s"} completed today
            </p>

            <section aria-label="Top 3 status">
              <p className="mb-[var(--space-2)] text-caption font-medium uppercase tracking-wide text-ink-muted">
                Top 3
              </p>
              <Top3ReviewSummary top3Status={payload.top3Status} />
            </section>

            <FocusTimeChart bars={payload.focusBars} overflowCount={payload.focusOverflowCount} />

            <section className="space-y-[var(--space-2)]" aria-label="Reflection">
              <p className="text-caption font-medium uppercase tracking-wide text-ink-muted">
                Summary
              </p>
              {aiLoading ? (
                <p className="text-body text-ink-muted">Claude is reflecting on your day…</p>
              ) : (
                <p className="whitespace-pre-wrap text-body text-ink">
                  {summary ? renderInlineBold(summary) : "—"}
                </p>
              )}

              {reflectiveQuestion ? (
                <>
                  <p className="mt-[var(--space-3)] text-body font-medium text-ink">
                    {reflectiveQuestion}
                  </p>
                  <label className="block text-caption text-ink-muted" htmlFor="eod-reflection">
                    Your answer (optional)
                  </label>
                  <Textarea
                    id="eod-reflection"
                    className="mt-[var(--space-1)] w-full resize-y text-body"
                    rows={3}
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    placeholder="A sentence or two…"
                  />
                </>
              ) : null}
            </section>
          </div>
        )}

        {saveError ? (
          <p className="mt-[var(--space-4)] text-body text-critical" role="alert">
            {saveError}
          </p>
        ) : null}

        <div className="mt-[var(--space-6)] flex flex-wrap gap-[var(--space-2)]">
          <Button
            type="button"
            className="text-body"
            disabled={payloadLoading || upsertMutation.isPending}
            onClick={() => void handleDone()}
          >
            Done
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-body"
            disabled={aiLoading}
            onClick={handleRegenerate}
          >
            Regenerate
          </Button>
          <Button type="button" variant="ghost" className="text-body" onClick={onSnooze}>
            Not now
          </Button>
          <Button type="button" variant="ghost" className="text-body" onClick={onSkip}>
            Skip today
          </Button>
        </div>
      </div>
    </div>
  );
}

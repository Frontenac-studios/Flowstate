"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import {
  isGenerateAttemptedForDate,
  readEodStorage,
  setGenerateAttemptedForDate,
} from "@/lib/eod/eod-storage";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="bg-kash-ink/20 absolute inset-0"
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
        className="glass-panel relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto p-6"
      >
        <h2 id="eod-review-title" className="text-lg font-semibold text-kash-ink">
          End of day review
        </h2>

        {payloadLoading || !payload ? (
          <p className="mt-4 text-sm text-kash-ink-muted">Loading your day…</p>
        ) : (
          <div id={summarySectionId} className="mt-4 space-y-5">
            <p className="text-sm text-kash-ink">
              <span className="font-semibold">{payload.completionsToday}</span> task
              {payload.completionsToday === 1 ? "" : "s"} completed today
            </p>

            <section aria-label="Top 3 status">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-kash-ink-muted">
                Top 3
              </p>
              <Top3ReviewSummary top3Status={payload.top3Status} />
            </section>

            <FocusTimeChart bars={payload.focusBars} overflowCount={payload.focusOverflowCount} />

            <section className="space-y-2" aria-label="Reflection">
              <p className="text-xs font-medium uppercase tracking-wide text-kash-ink-muted">
                Summary
              </p>
              {aiLoading ? (
                <p className="text-sm text-kash-ink-muted">Claude is reflecting on your day…</p>
              ) : (
                <p className="whitespace-pre-wrap text-sm text-kash-ink">
                  {summary ? renderInlineBold(summary) : "—"}
                </p>
              )}

              {reflectiveQuestion ? (
                <>
                  <p className="mt-3 text-sm font-medium text-kash-ink">{reflectiveQuestion}</p>
                  <label className="block text-xs text-kash-ink-muted" htmlFor="eod-reflection">
                    Your answer (optional)
                  </label>
                  <textarea
                    id="eod-reflection"
                    className="glass-input glass-textarea mt-1 w-full resize-y text-sm"
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
          <p className="mt-4 text-sm text-red-700" role="alert">
            {saveError}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            className="glass-btn-primary px-4 py-2 text-sm"
            disabled={payloadLoading || upsertMutation.isPending}
            onClick={() => void handleDone()}
          >
            Done
          </button>
          <button
            type="button"
            className="glass-btn-ghost text-sm"
            disabled={aiLoading}
            onClick={handleRegenerate}
          >
            Regenerate
          </button>
          <button type="button" className="glass-btn-ghost text-sm" onClick={onSnooze}>
            Not now
          </button>
          <button type="button" className="glass-btn-ghost text-sm" onClick={onSkip}>
            Skip today
          </button>
        </div>
      </div>
    </div>
  );
}

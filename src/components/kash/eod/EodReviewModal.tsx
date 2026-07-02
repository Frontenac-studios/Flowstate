"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { BalanceBar } from "@/components/kash/plan/BalanceBar";
import {
  isGenerateAttemptedForDate,
  readEodStorage,
  setGenerateAttemptedForDate,
} from "@/lib/eod/eod-storage";
import Button from "@/components/kash/ui/Button";
import Textarea from "@/components/kash/ui/Textarea";
import { RitualSheet } from "@/components/kash/ui/RitualSheet";
import { templateEodReview } from "@/lib/eod/template-eod-review";
import type { HandoffPlanTask } from "@/lib/morning-handoff/handoff-task-filters";
import { filterAssembledTodayList } from "@/lib/morning-handoff/handoff-task-filters";
import { renderInlineBold } from "@/lib/markdown/inline-bold";
import { useTRPC } from "@/trpc/client";

import { DailyWinsTracker } from "./DailyWinsTracker";
import { EodLeftoverTriage } from "./EodLeftoverTriage";
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

  const { data: incompleteTasks = [] } = useQuery({
    ...trpc.tasks.listIncomplete.queryOptions(),
    enabled: open,
  });

  const todayTasks = useMemo(
    () => filterAssembledTodayList(incompleteTasks as HandoffPlanTask[], localDate),
    [incompleteTasks, localDate]
  );

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

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      onSnooze();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onSnooze]);

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

  return (
    <RitualSheet
      open={open}
      title="End of day"
      titleId="eod-review-title"
      describedBy={payload && !payloadLoading ? summarySectionId : undefined}
      onDismiss={onClose}
      footer={
        <div className="flex flex-wrap gap-[var(--space-2)]">
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
      }
    >
      {payloadLoading || !payload ? (
        <p className="text-body text-ink-muted">Loading your day…</p>
      ) : (
        <div id={summarySectionId} className="space-y-[var(--space-6)]">
          <section aria-label="Celebration" className="space-y-[var(--space-4)]">
            <p className="text-body text-ink">
              <span className="text-title font-semibold">{payload.completionsToday}</span> task
              {payload.completionsToday === 1 ? "" : "s"} completed today
            </p>
            <BalanceBar tasks={todayTasks} showGhostWhenSparse />
            <DailyWinsTracker winDate={localDate} tzOffsetMinutes={tzOffsetMinutes} />
            <section aria-label="Top 3 status">
              <p className="mb-[var(--space-2)] text-caption font-medium uppercase tracking-wide text-ink-muted">
                Top 3
              </p>
              <Top3ReviewSummary top3Status={payload.top3Status} />
            </section>
            <FocusTimeChart bars={payload.focusBars} overflowCount={payload.focusOverflowCount} />
          </section>

          <section className="space-y-[var(--space-2)]" aria-label="Reflection">
            <p className="text-caption font-medium uppercase tracking-wide text-ink-muted">
              Reflection
            </p>
            {aiLoading ? (
              <p className="eod-reflecting-pulse text-body text-ink-muted">
                Claude is reflecting on your day…
              </p>
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

          <section aria-label="Leftover triage">
            <p className="mb-[var(--space-3)] text-caption font-medium uppercase tracking-wide text-ink-muted">
              Still open
            </p>
            <EodLeftoverTriage localDate={localDate} tasks={incompleteTasks as HandoffPlanTask[]} />
          </section>
        </div>
      )}

      {saveError ? (
        <p className="mt-[var(--space-4)] text-body text-critical" role="alert">
          {saveError}
        </p>
      ) : null}
    </RitualSheet>
  );
}

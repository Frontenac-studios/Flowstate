"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import Button from "@/components/kash/ui/Button";
import Textarea from "@/components/kash/ui/Textarea";
import WeekWindDownSetting from "@/components/kash/week/WeekWindDownSetting";
import { templateEowReview } from "@/lib/eow/template-eow-review";
import { renderInlineBold } from "@/lib/markdown/inline-bold";
import { useTRPC } from "@/trpc/client";

/**
 * Inline quick-expand under the This Week header (design #8): a compact weekly
 * summary sentence, an editable reflection textarea saved via
 * `weekReviews.upsert`, the week wind-down control, and a link to the full
 * review subview. The heavy charts intentionally live only on the subview.
 */
export function WeekReflectionPanel() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const tzOffsetMinutes = useMemo(() => -new Date().getTimezoneOffset(), []);

  const { data: stored } = useQuery(trpc.weekReviews.getForWeek.queryOptions({ tzOffsetMinutes }));
  const { data: payload } = useQuery(trpc.weekReviews.getPayload.queryOptions({ tzOffsetMinutes }));

  const upsertMutation = useMutation(
    trpc.weekReviews.upsert.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.weekReviews.getForWeek.queryKey({ tzOffsetMinutes }),
        });
        setSaved(true);
      },
    })
  );
  const generateMutation = useMutation(trpc.weekReviews.generateSummary.mutationOptions());

  const [reflection, setReflection] = useState("");
  const [summary, setSummary] = useState("");
  const [saved, setSaved] = useState(false);
  const hydratedForRef = useRef<string | null>(null);

  // Hydrate the textarea + summary from the stored row once it arrives (keyed
  // on the row id so a later refetch of the same week doesn't clobber edits).
  useEffect(() => {
    const key = stored?.id ?? "none";
    if (hydratedForRef.current === key) return;
    hydratedForRef.current = key;
    setReflection(stored?.reflectionText ?? "");
    if (stored?.summary) setSummary(stored.summary);
  }, [stored?.id, stored?.reflectionText, stored?.summary]);

  // Fall back to the local template summary (no AI cost) when nothing stored.
  useEffect(() => {
    if (summary || !payload || stored?.summary) return;
    setSummary(
      templateEowReview({
        totalSeconds: payload.totalSeconds,
        completionsThisWeek: payload.completionsThisWeek,
        byCategory: payload.byCategory,
        byProject: payload.byProject,
        projectProgress: payload.projectProgress,
      }).summary
    );
  }, [payload, stored?.summary, summary]);

  const handleGenerate = () => {
    generateMutation
      .mutateAsync({ tzOffsetMinutes })
      .then((result) => setSummary(result.summary))
      .catch(() => {
        /* keep the template summary already shown */
      });
  };

  const handleSave = () => {
    setSaved(false);
    upsertMutation.mutate({
      tzOffsetMinutes,
      reflectionText: reflection.trim(),
      ...(summary ? { summary } : {}),
    });
  };

  return (
    <section
      className="flex shrink-0 flex-col gap-4 rounded-card border border-subtle bg-surface p-5 shadow-surface"
      aria-label="Weekly reflection"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Reflection</p>
        <Link
          href="/this-week/review"
          className="text-sm text-accent underline-offset-2 hover:underline"
        >
          View details →
        </Link>
      </div>

      <div className="flex items-start justify-between gap-3">
        {summary ? (
          <p className="text-sm text-ink">
            {generateMutation.isPending ? "Reflecting on your week…" : renderInlineBold(summary)}
          </p>
        ) : (
          <p className="text-sm text-ink-muted">No focus logged this week yet.</p>
        )}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
          className="shrink-0 rounded-pill border border-border bg-surface px-2.5 py-1 text-xs text-ink-muted transition hover:text-ink focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)] disabled:opacity-50"
        >
          {generateMutation.isPending ? "Generating…" : "Generate with AI"}
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="week-reflection" className="text-xs text-ink-muted">
          Your reflection
        </label>
        <Textarea
          id="week-reflection"
          value={reflection}
          onChange={(e) => {
            setReflection(e.target.value);
            setSaved(false);
          }}
          placeholder="What went well? What would you change next week?"
          rows={3}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <WeekWindDownSetting />
        <div className="flex items-center gap-2">
          {saved ? (
            <span className="text-xs text-accent" role="status">
              Saved
            </span>
          ) : null}
          <Button
            type="button"
            className="text-sm"
            onClick={handleSave}
            disabled={upsertMutation.isPending}
          >
            {upsertMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </section>
  );
}

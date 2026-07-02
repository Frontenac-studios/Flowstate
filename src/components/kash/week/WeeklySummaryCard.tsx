"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { categorySeedLabel, categorySolidVar } from "@/lib/projects/category-tokens";
import {
  isEowGenerateAttemptedForWeek,
  readEowStorage,
  setEowGenerateAttemptedForWeek,
} from "@/lib/eow/eow-storage";
import { templateEowReview } from "@/lib/eow/template-eow-review";
import { renderInlineBold } from "@/lib/markdown/inline-bold";
import { formatDuration } from "@/lib/time/duration";
import { useTRPC } from "@/trpc/client";

import WeekWindDownSetting from "./WeekWindDownSetting";

const DAY_MONTH: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

/** "Jun 23 – Jun 29": weekEnd is the exclusive next Monday, so show the Sunday. */
function formatWeekRange(weekStart: Date, weekEnd: Date): string {
  const lastDay = new Date(weekEnd.getTime() - 86_400_000);
  return `${weekStart.toLocaleDateString(undefined, DAY_MONTH)} – ${lastDay.toLocaleDateString(
    undefined,
    DAY_MONTH
  )}`;
}

/**
 * End-of-week roll-up (Phase 2.5 + WD6): focus time by category/project, weighted
 * % progress per project/phase, and a reflection voice that narrates wins. The
 * review never auto-opens — a soft chip (EowReviewRunner) scrolls here on tap.
 */
export default function WeeklySummaryCard() {
  const trpc = useTRPC();
  const tzOffsetMinutes = useMemo(() => -new Date().getTimezoneOffset(), []);
  const { data } = useQuery(trpc.weekReviews.getPayload.queryOptions({ tzOffsetMinutes }));

  const [summary, setSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const hydratedForWeekRef = useRef<string | null>(null);

  const generateMutation = useMutation(trpc.weekReviews.generateSummary.mutationOptions());

  const applyTemplate = useCallback(() => {
    if (!data) return;
    setSummary(
      templateEowReview({
        totalSeconds: data.totalSeconds,
        completionsThisWeek: data.completionsThisWeek,
        byCategory: data.byCategory,
        byProject: data.byProject,
        projectProgress: data.projectProgress,
      }).summary
    );
  }, [data]);

  useEffect(() => {
    if (!data) return;
    if (hydratedForWeekRef.current === data.weekStartIso) return;
    hydratedForWeekRef.current = data.weekStartIso;
    setSummary("");

    const storage = readEowStorage();
    if (isEowGenerateAttemptedForWeek(data.weekStartIso, storage.generateAttemptedForWeek)) {
      applyTemplate();
      return;
    }

    setEowGenerateAttemptedForWeek(data.weekStartIso);

    let cancelled = false;
    setAiLoading(true);
    generateMutation
      .mutateAsync({ tzOffsetMinutes })
      .then((result) => {
        if (!cancelled) setSummary(result.summary);
      })
      .catch(() => {
        if (!cancelled) applyTemplate();
      })
      .finally(() => {
        if (!cancelled) setAiLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applyTemplate, data, generateMutation, tzOffsetMinutes]);

  if (!data) return null;

  const { byCategory, byProject, totalSeconds, weekStart, weekEnd, projectProgress } = data;
  const maxCategory = Math.max(...byCategory.map((c) => c.seconds), 1);

  return (
    <section
      id="weekly-summary"
      className="rounded-card border border-subtle bg-surface p-5"
      aria-label="Weekly focus summary"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          This week
        </span>
        <span className="text-xs text-ink-faint">{formatWeekRange(weekStart, weekEnd)}</span>
      </div>

      <div className="mt-2">
        <WeekWindDownSetting />
      </div>

      {summary ? (
        <div className="mt-4 rounded-row border border-subtle bg-surface-2 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Reflection</p>
          <p className="mt-2 text-sm text-ink">
            {aiLoading ? "Reflecting on your week…" : renderInlineBold(summary)}
          </p>
        </div>
      ) : aiLoading ? (
        <p className="mt-4 text-sm text-ink-muted">Reflecting on your week…</p>
      ) : null}

      {data.balanceDigest ? (
        <div className="mt-4 rounded-row border border-subtle bg-surface-2 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Balance</p>
          <p className="mt-2 text-sm text-ink-muted">{data.balanceDigest}</p>
          {data.balanceDigestRows && data.balanceDigestRows.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {data.balanceDigestRows.map((row) => (
                <li key={row.category} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-ink">{row.label}</span>
                  {row.offerTitle ? (
                    <span className="truncate text-ink-muted">{row.offerTitle}</span>
                  ) : (
                    <span className="text-ink-faint">Add something small</span>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {totalSeconds === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">No focus time logged this week yet.</p>
      ) : (
        <>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-medium text-ink">{formatDuration(totalSeconds)}</span>
            <span className="text-sm text-ink-muted">focused this week</span>
          </div>

          <p className="mt-5 text-xs font-medium uppercase tracking-wide text-ink-muted">
            By category
          </p>
          <ul className="mt-2 space-y-3" aria-label="Focus time by category">
            {byCategory.map((row) => (
              <li key={row.category} className="space-y-1">
                <div className="flex justify-between gap-2 text-sm">
                  <span className="text-ink">{categorySeedLabel(row.category)}</span>
                  <span className="shrink-0 text-ink-muted">{formatDuration(row.seconds)}</span>
                </div>
                <div className="h-[var(--space-2)] overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
                    style={{
                      width: `${Math.round((row.seconds / maxCategory) * 100)}%`,
                      backgroundColor: categorySolidVar(row.category),
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-5 text-xs font-medium uppercase tracking-wide text-ink-muted">
            By project
          </p>
          <ul className="mt-2 space-y-2" aria-label="Focus time by project">
            {byProject.map((row) => (
              <li
                key={row.projectId ?? "loose"}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-sm"
                    style={{
                      backgroundColor: row.projectId ? "var(--accent)" : "var(--ink-faint)",
                    }}
                  />
                  <span className={`truncate ${row.projectId ? "text-ink" : "text-ink-muted"}`}>
                    {row.projectName ?? "No project"}
                  </span>
                </span>
                <span className="shrink-0 text-ink-muted">{formatDuration(row.seconds)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {projectProgress.length > 0 ? (
        <>
          <p className="mt-5 text-xs font-medium uppercase tracking-wide text-ink-muted">
            Progress
          </p>
          <ul className="mt-2 space-y-4" aria-label="Weighted completion by project">
            {projectProgress.map((project) => (
              <li key={project.projectId} className="space-y-2">
                <div className="space-y-1">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="font-medium text-ink">{project.projectName}</span>
                    <span className="shrink-0 text-ink-muted">{project.percent}%</span>
                  </div>
                  <div className="h-[var(--space-2)] overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-accent transition-[width] duration-300 motion-reduce:transition-none"
                      style={{ width: `${project.percent}%` }}
                    />
                  </div>
                </div>
                {project.phases.length > 0 ? (
                  <ul className="space-y-1.5 pl-3" aria-label={`${project.projectName} phases`}>
                    {project.phases.map((phase) => (
                      <li
                        key={phase.phaseId}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="truncate text-ink-muted">{phase.phaseName}</span>
                        <span className="shrink-0 text-ink-faint">{phase.percent}%</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import Select from "@/components/kash/ui/Select";
import { formatDuration } from "@/lib/time/duration";
import { useTRPC } from "@/trpc/client";

function clockLabel(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/**
 * End-of-day gap fill (W2c): the untracked spans over 15 minutes in the working
 * day, each one-click assignable to a project or dismissed. Renders inside the
 * Today "Review" panel so the day's log can be made true before the close.
 *
 * Dismissal is session-local on purpose: a gap is about reconciling *today*, and a
 * day that rolls over stops proposing it; anything left unreconciled is the Friday
 * Sweep's job (W7), not a persisted per-gap flag.
 */
export default function GapFill({
  localDate,
  tzOffsetMinutes,
}: {
  localDate: string;
  tzOffsetMinutes: number;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const gapsInput = { localDate, tzOffsetMinutes };
  const { data: gaps = [] } = useQuery(trpc.timeEntries.listDayGaps.queryOptions(gapsInput));
  const { data: projects = [] } = useQuery(trpc.projects.list.queryOptions());

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [choice, setChoice] = useState<Record<string, string>>({});

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries(trpc.timeEntries.listDayGaps.pathFilter());
    void queryClient.invalidateQueries(trpc.dayReviews.getPayload.pathFilter());
    void queryClient.invalidateQueries(trpc.planning.getYearActivity.pathFilter());
    void queryClient.invalidateQueries(trpc.planning.getQuarterActivity.pathFilter());
  }, [queryClient, trpc]);

  const assignMutation = useMutation(
    trpc.timeEntries.createForProject.mutationOptions({ onSuccess: invalidate })
  );

  const sortedProjects = useMemo(
    () =>
      [...projects].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [projects]
  );

  const visible = gaps.filter((g) => !dismissed.has(g.startedAt.toString()));
  if (visible.length === 0) return null;

  const assign = (gap: (typeof gaps)[number]) => {
    const projectId = choice[gap.startedAt.toString()] || sortedProjects[0]?.id;
    if (!projectId) return;
    assignMutation.mutate({
      projectId,
      startedAt: gap.startedAt,
      endedAt: gap.endedAt,
      source: "gap_fill",
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-caption font-medium uppercase tracking-wide text-ink-muted">
        Untracked time
      </span>
      <ul className="flex flex-col gap-1.5">
        {visible.map((gap) => {
          const key = gap.startedAt.toString();
          return (
            <li
              key={key}
              className="flex flex-wrap items-center gap-2 rounded-control border border-subtle bg-surface px-3 py-1.5 text-xs text-ink"
            >
              <span className="tabular-nums">
                {clockLabel(gap.startedAt)}–{clockLabel(gap.endedAt)}
              </span>
              <span className="text-ink-muted">
                {formatDuration(gap.durationSeconds)} untracked
              </span>
              <span className="flex-1" />
              {sortedProjects.length > 0 ? (
                <Select
                  aria-label="Assign to project"
                  value={choice[key] || sortedProjects[0]!.id}
                  onChange={(e) => setChoice((c) => ({ ...c, [key]: e.target.value }))}
                  className="py-1 text-xs"
                >
                  {sortedProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              ) : (
                <span className="text-ink-faint">No projects</span>
              )}
              <button
                type="button"
                onClick={() => assign(gap)}
                disabled={assignMutation.isPending || sortedProjects.length === 0}
                className="rounded-control bg-ink px-2.5 py-1 font-medium text-surface transition hover:opacity-90 disabled:opacity-50"
              >
                Assign
              </button>
              <button
                type="button"
                onClick={() => setDismissed((d) => new Set(d).add(key))}
                className="text-ink-muted transition hover:text-ink"
              >
                Dismiss
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { evidenceCadenceSchema } from "@/lib/settings/constants";
import { useTRPC } from "@/trpc/client";

const CADENCE_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "off", label: "Off" },
] as const;

function clientTzOffsetMinutes(): number {
  return -new Date().getTimezoneOffset();
}

/** Wins tab: 7-day pulse on top, Evidence shrine below (E4). */
export function CareWins() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const tzOffsetMinutes = useMemo(() => clientTzOffsetMinutes(), []);

  const { data: settings } = useQuery(trpc.settings.get.queryOptions());
  const { data: winHistory } = useQuery(
    trpc.dailyWins.listRecent.queryOptions({
      days: 7,
      hitRateWindow: 7,
      tzOffsetMinutes,
    })
  );
  const { data: editions } = useQuery(trpc.evidence.list.queryOptions({ limit: 8 }));
  const { data: latest } = useQuery(trpc.evidence.getLatest.queryOptions());

  const ensurePeriodic = useMutation(trpc.evidence.ensurePeriodic.mutationOptions());
  const markSeen = useMutation(
    trpc.evidence.markSeen.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.evidence.getLatest.queryKey() });
        void queryClient.invalidateQueries({ queryKey: trpc.evidence.list.queryKey() });
      },
    })
  );
  const setCadence = useMutation(
    trpc.evidence.setCadence.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.settings.get.queryKey() });
      },
    })
  );

  useEffect(() => {
    void ensurePeriodic.mutateAsync({});
  }, [ensurePeriodic]);

  useEffect(() => {
    if (latest?.state === "unseen") {
      void markSeen.mutateAsync({ id: latest.id });
    }
  }, [latest?.id, latest?.state, markSeen]);

  const cadence = settings?.evidenceCadence ?? "quarterly";
  const displayEdition = latest ?? editions?.[0] ?? null;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-card border border-subtle bg-surface p-4">
        <h2 className="text-caption font-medium uppercase tracking-wide text-ink-muted">
          7-day pulse
        </h2>
        <p className="mt-2 text-body text-ink">{winHistory?.hitRate.phrase ?? "Wins building…"}</p>
        {winHistory?.days.length ? (
          <ul className="mt-3 space-y-1">
            {winHistory.days.slice(0, 7).map((day) => (
              <li key={day.winDate} className="text-caption text-ink-muted">
                {day.winDate}: {day.wins.map((w) => w.label).join(" · ")}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-caption text-ink-faint">No wins logged yet this week.</p>
        )}
      </section>

      <section className="rounded-card border border-subtle bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-caption font-medium uppercase tracking-wide text-ink-muted">
            Evidence
          </h2>
          <label className="flex items-center gap-2 text-caption text-ink-muted">
            Cadence
            <select
              className="rounded-control border border-subtle bg-surface px-2 py-1 text-caption text-ink"
              value={cadence}
              disabled={setCadence.isPending}
              onChange={(e) => {
                const parsed = evidenceCadenceSchema.safeParse(e.target.value);
                if (parsed.success) setCadence.mutate({ evidenceCadence: parsed.data });
              }}
            >
              {CADENCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {!displayEdition ? (
          <p className="mt-4 text-body text-ink-muted">
            Evidence builds as you do. Your wins and reflections will gather here.
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-4 motion-safe:animate-[fadeIn_400ms_ease-out]">
            <p className="text-body text-ink">{displayEdition.narrative.throughline}</p>
            <ul className="flex flex-col gap-2 border-t border-subtle pt-3">
              {displayEdition.narrative.anchors.map((anchor) => (
                <li key={`${anchor.type}-${anchor.id}`} className="text-caption text-ink-muted">
                  {anchor.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {editions && editions.length > 1 ? (
          <details className="mt-4">
            <summary className="cursor-pointer text-caption text-ink-muted hover:text-ink">
              Prior editions ({editions.length - 1})
            </summary>
            <ul className="mt-2 space-y-3">
              {editions.slice(1).map((edition) => (
                <li key={edition.id} className="rounded-control border border-subtle px-3 py-2">
                  <p className="text-caption text-ink-faint">
                    {edition.periodStart} – {edition.periodEnd}
                  </p>
                  <p className="mt-1 text-caption text-ink-muted">
                    {edition.narrative.throughline}
                  </p>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>
    </div>
  );
}

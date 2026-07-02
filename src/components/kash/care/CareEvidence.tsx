"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { GhostFacetStrip } from "@/components/kash/daily-wins/GhostFacetStrip";
import { WinFacetBadge } from "@/components/kash/daily-wins/WinFacetBadge";
import { facetCssVars } from "@/lib/daily-wins/facets";
import { inferWinFacet } from "@/lib/daily-wins/facets";
import { MOOD_OPTIONS } from "@/lib/care/reflection-prompt";
import { formatHeaderDate, parseISODateString, toISODateString } from "@/lib/dates/local-day";
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

function formatWinCardDate(winDate: string, today: string): string {
  if (winDate === today) return "Today";
  const todayDate = parseISODateString(today);
  const yesterdayIso = toISODateString(new Date(todayDate.getTime() - 86_400_000));
  if (winDate === yesterdayIso) return "Yesterday";
  return formatHeaderDate(parseISODateString(winDate));
}

function maxFrequency(counts: ReadonlyArray<{ count: number }>): number {
  return counts.reduce((max, day) => Math.max(max, day.count), 0);
}

/** Evidence tab — shrine/editions lead, stats + recent wins below (D33). */
export function CareEvidence() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const tzOffsetMinutes = useMemo(() => clientTzOffsetMinutes(), []);

  const { data: settings } = useQuery(trpc.settings.get.queryOptions());
  const historyQuery = useQuery(
    trpc.dailyWins.listRecent.queryOptions({ tzOffsetMinutes, days: 14, hitRateWindow: 7 })
  );
  const statsQuery = useQuery(trpc.care.getStatsSummary.queryOptions({ days: 14 }));
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
  const history = historyQuery.data;
  const stats = statsQuery.data;
  const freqMax = maxFrequency(stats?.frequencyDays ?? []);
  const hasMoodData = (stats?.moodPoints.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-5">
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

      <section className="rounded-card border border-subtle bg-surface p-4">
        <h2 className="text-caption font-medium text-ink-muted">Gentle hit-rate</h2>
        {historyQuery.isLoading ? (
          <p className="mt-2 text-body text-ink-faint">Loading…</p>
        ) : (
          <>
            <p className="mt-2 text-subtitle font-medium text-ink">{history?.hitRate.phrase}</p>
            <p className="mt-1 text-meta leading-snug text-ink-muted">
              A quiet look at how often you noticed good — not a streak, not a score.
            </p>
          </>
        )}
      </section>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <section className="flex flex-col gap-3 rounded-card border border-subtle bg-surface p-4">
          <h2 className="text-caption font-medium text-ink-muted">Self-care frequency</h2>
          {statsQuery.isLoading ? (
            <p className="text-meta text-ink-faint">Loading…</p>
          ) : (
            <>
              <p className="text-body leading-snug text-ink">{stats?.frequencyPhrase}</p>
              <div className="flex items-end gap-1 pt-1" aria-hidden>
                {stats?.frequencyDays.map((day) => (
                  <div
                    key={day.date}
                    className="flex-1 rounded-[3px] bg-[var(--cat-body-mind-fill)]"
                    style={{
                      height: `${Math.max(6, freqMax > 0 ? (day.count / freqMax) * 48 : 6)}px`,
                      opacity: day.count > 0 ? 1 : 0.25,
                    }}
                  />
                ))}
              </div>
              <p className="text-caption text-ink-faint">
                {stats?.totalEvents ?? 0} acts in the last 14 days
              </p>
            </>
          )}
        </section>
        {hasMoodData ? (
          <section className="flex flex-col gap-3 rounded-card border border-subtle bg-surface p-4">
            <h2 className="text-caption font-medium text-ink-muted">Mood trend</h2>
            {statsQuery.isLoading ? (
              <p className="text-meta text-ink-faint">Loading…</p>
            ) : (
              <>
                <p className="text-body leading-snug text-ink">{stats?.moodPhrase}</p>
                <ul className="flex flex-wrap gap-2">
                  {stats?.moodPoints.slice(0, 7).map((point) => (
                    <li
                      key={`${point.date}-${point.mood}`}
                      className="rounded-chip border border-subtle px-2 py-1 text-caption text-ink-muted"
                    >
                      {point.date.slice(5)}{" "}
                      {MOOD_OPTIONS.find((option) => option.value === point.mood)?.emoji}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        ) : null}
      </div>

      {stats?.facetFrequencies.length ? (
        <section className="flex flex-col gap-3 rounded-card border border-subtle bg-surface p-4">
          <h2 className="text-caption font-medium text-ink-muted">By facet</h2>
          <p className="text-meta leading-snug text-ink-faint">
            Body · Mind · Soul — gentle counts, no targets.
          </p>
          <ul className="flex flex-col gap-2">
            {stats.facetFrequencies.map((row) => {
              const vars = facetCssVars(row.facet);
              return (
                <li
                  key={row.facet}
                  className="flex items-center gap-3 rounded-control px-2 py-1.5"
                  style={{ backgroundColor: vars.fill }}
                >
                  <WinFacetBadge facet={row.facet} />
                  <span className="min-w-0 flex-1 text-caption text-ink-muted">{row.phrase}</span>
                  <span className="text-caption font-medium" style={{ color: vars.text }}>
                    {row.count}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-subtitle font-medium text-ink">Recent wins</h2>
        {historyQuery.isLoading ? (
          <p className="text-meta text-ink-faint">Loading…</p>
        ) : history?.days.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-card border border-subtle bg-surface px-6 py-10 text-center">
            <GhostFacetStrip className="w-32" />
            <p className="text-sm font-medium text-ink">Wins gather here as you notice them</p>
            <p className="max-w-sm text-xs text-ink-muted">
              Body · Mind · Soul — three small proofs the day counted. No streak, no score.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {history?.days.map((day) => (
              <li key={day.winDate} className="rounded-card border border-subtle bg-surface p-3">
                <h3 className="mb-2 text-caption font-medium text-ink-muted">
                  {formatWinCardDate(day.winDate, history.today)}
                </h3>
                <ul className="flex flex-col gap-1">
                  {day.wins.map((win) => {
                    const facet = inferWinFacet({
                      source: win.source,
                      label: win.label,
                      slot: win.slot,
                    });
                    return (
                      <li key={win.id} className="flex items-start gap-2 rounded-row px-1 py-0.5">
                        <WinFacetBadge facet={facet} className="mt-0.5" />
                        <span className="text-body text-ink">{win.label}</span>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

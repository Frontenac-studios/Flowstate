"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { MOOD_OPTIONS } from "@/lib/care/reflection-prompt";
import { formatHeaderDate, parseISODateString, toISODateString } from "@/lib/dates/local-day";
import { useTRPC } from "@/trpc/client";

import { GardenScene } from "./GardenScene";
import { useGardenNourishPulse } from "./useGardenNourishPulse";

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

export function CareStats() {
  const trpc = useTRPC();
  const tzOffsetMinutes = useMemo(() => clientTzOffsetMinutes(), []);

  const historyQuery = useQuery(
    trpc.dailyWins.listRecent.queryOptions({ tzOffsetMinutes, days: 14, hitRateWindow: 7 })
  );
  const gardenQuery = useQuery(trpc.care.getGardenState.queryOptions());
  const statsQuery = useQuery(trpc.care.getStatsSummary.queryOptions({ days: 14 }));
  const nourishmentsQuery = useQuery(trpc.care.recentWinNourishments.queryOptions({ limit: 8 }));

  const { activeBeat, pulseKey } = useGardenNourishPulse(nourishmentsQuery.data);
  const history = historyQuery.data;
  const garden = gardenQuery.data;
  const stats = statsQuery.data;
  const freqMax = maxFrequency(stats?.frequencyDays ?? []);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.15fr_1fr]">
        <GardenScene
          nourishCount={garden?.nourishCount ?? 0}
          growthTier={garden?.growthTier ?? 0}
          lifeState={garden?.lifeState ?? "active"}
          nourishBeat={activeBeat}
          nourishPulseKey={pulseKey}
        />
        <section className="flex flex-col justify-center gap-2 rounded-card border border-subtle bg-surface p-4">
          <h2 className="text-caption font-medium text-ink-muted">Gentle hit-rate</h2>
          {historyQuery.isLoading ? (
            <p className="text-body text-ink-faint">Loading…</p>
          ) : (
            <>
              <p className="text-subtitle font-medium text-ink">{history?.hitRate.phrase}</p>
              <p className="text-meta leading-snug text-ink-muted">
                A quiet look at how often you noticed good — not a streak, not a score.
              </p>
            </>
          )}
        </section>
      </div>

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
        <section className="flex flex-col gap-3 rounded-card border border-subtle bg-surface p-4">
          <h2 className="text-caption font-medium text-ink-muted">Mood trend</h2>
          {statsQuery.isLoading ? (
            <p className="text-meta text-ink-faint">Loading…</p>
          ) : (
            <>
              <p className="text-body leading-snug text-ink">{stats?.moodPhrase}</p>
              {stats?.moodPoints.length ? (
                <ul className="flex flex-wrap gap-2">
                  {stats.moodPoints.slice(0, 7).map((point) => (
                    <li
                      key={`${point.date}-${point.mood}`}
                      className="rounded-chip border border-subtle px-2 py-1 text-caption text-ink-muted"
                    >
                      {point.date.slice(5)}{" "}
                      {MOOD_OPTIONS.find((option) => option.value === point.mood)?.emoji}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-caption text-ink-faint">Mood notes come from Reflection.</p>
              )}
            </>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-subtitle font-medium text-ink">Recent wins</h2>
        {historyQuery.isLoading ? (
          <p className="text-meta text-ink-faint">Loading…</p>
        ) : history?.days.length === 0 ? (
          <div className="rounded-card border border-subtle bg-surface px-4 py-8 text-center">
            <p className="text-body text-ink-muted">No wins logged yet.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {history?.days.map((day) => (
              <li key={day.winDate} className="rounded-card border border-subtle bg-surface p-3">
                <h3 className="mb-2 text-caption font-medium text-ink-muted">
                  {formatWinCardDate(day.winDate, history.today)}
                </h3>
                <ul className="flex flex-col gap-1">
                  {day.wins.map((win) => (
                    <li key={win.id} className="flex items-start gap-2 rounded-row px-1 py-0.5">
                      <span
                        className="text-on-accent mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] bg-cat-body-mind text-caption"
                        aria-hidden
                      >
                        ✓
                      </span>
                      <span className="text-body text-ink">{win.label}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

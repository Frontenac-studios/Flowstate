"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { formatHeaderDate, parseISODateString, toISODateString } from "@/lib/dates/local-day";
import { useTRPC } from "@/trpc/client";

import { GardenScene } from "./GardenScene";
import { useGardenNourishPulse } from "./useGardenNourishPulse";

function clientTzOffsetMinutes(): number {
  return -new Date().getTimezoneOffset();
}

function formatWinCardDate(winDate: string, today: string): string {
  if (winDate === today) return "Today";

  const date = parseISODateString(winDate);
  const todayDate = parseISODateString(today);
  const yesterdayIso = toISODateString(new Date(todayDate.getTime() - 86_400_000));
  if (winDate === yesterdayIso) return "Yesterday";

  return formatHeaderDate(date);
}

/**
 * Care Stats tab — daily wins history, gentle hit-rate, and garden nourish (DWN-3 / DW-5).
 * Frequency and mood charts ship in a later slice; wins land first per care-build-spec.
 */
export function CareStats() {
  const trpc = useTRPC();
  const tzOffsetMinutes = useMemo(() => clientTzOffsetMinutes(), []);

  const historyQuery = useQuery(
    trpc.dailyWins.listRecent.queryOptions({ tzOffsetMinutes, days: 14, hitRateWindow: 7 })
  );
  const gardenQuery = useQuery(trpc.care.getGardenState.queryOptions());
  const nourishmentsQuery = useQuery(trpc.care.recentWinNourishments.queryOptions({ limit: 8 }));

  const { activeBeat, pulseKey } = useGardenNourishPulse(nourishmentsQuery.data);
  const history = historyQuery.data;
  const garden = gardenQuery.data;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.15fr_1fr]">
        <GardenScene
          nourishCount={garden?.nourishCount ?? 0}
          growthTier={garden?.growthTier ?? 0}
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

      <section className="flex flex-col gap-3">
        <h2 className="text-subtitle font-medium text-ink">Recent wins</h2>

        {historyQuery.isLoading ? (
          <p className="text-meta text-ink-faint">Loading…</p>
        ) : history?.days.length === 0 ? (
          <div className="rounded-card border border-subtle bg-surface px-4 py-8 text-center">
            <p className="text-body text-ink-muted">No wins logged yet.</p>
            <p className="mt-1 text-meta text-ink-faint">Tomorrow&apos;s a fresh page.</p>
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

      <section className="rounded-card border border-dashed border-subtle bg-surface-2 px-4 py-5 text-center">
        <p className="text-meta text-ink-faint">
          Self-care frequency and mood trends are on the way — wins are here first.
        </p>
      </section>
    </div>
  );
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import DirectionCard from "@/components/kash/quarter/DirectionCard";
import QuarterFirstRun from "@/components/kash/quarter/QuarterFirstRun";
import SmartComposer from "@/components/kash/quarter/SmartComposer";
import {
  daysLeftInQuarter,
  quarterLabel,
  quarterMonthSpan,
  quarterOf,
} from "@/lib/quarter/quarter-period";
import { useTRPC } from "@/trpc/client";

const MAX_DIRECTIONS = 2;
const MAX_TARGETS = 3;

/** "$40k", "$1.5k", "$900" — a whole-dollar measure from cents. */
function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(dollars % 1000 === 0 ? 0 : 1)}k`;
  return `$${dollars.toLocaleString()}`;
}

/**
 * The Quarter surface (W5, MISSION law 4c). W5b ships the shell, the Directions
 * block, the smart composer, and the guided first-run. The bets render minimally
 * here — full cards, movement, and the cap-as-a-moment land in W5c; Learning,
 * read-strips, and the review banner in W5e/f/g.
 */
export default function QuarterSurface() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const now = new Date();
  const q = quarterOf(now);
  const daysLeft = daysLeftInQuarter(q, now);

  const { data: directions = [] } = useQuery(trpc.directions.list.queryOptions());
  const { data: targets = [] } = useQuery(trpc.targets.list.queryOptions());
  const { data: settings } = useQuery(trpc.settings.get.queryOptions());

  const dismissFirstRun = useMutation(
    trpc.settings.dismissQuarterFirstRun.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries(trpc.settings.get.pathFilter()),
    })
  );

  const showFirstRun =
    settings != null && settings.quarterFirstRunAt == null && directions.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-2">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-title font-semibold text-ink">Quarter</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {quarterLabel(q)} · {quarterMonthSpan(q)}
          </p>
        </div>
        <span className="shrink-0 text-caption text-ink-muted">
          {daysLeft} {daysLeft === 1 ? "day" : "days"} left
        </span>
      </header>

      {showFirstRun ? <QuarterFirstRun onDismiss={() => dismissFirstRun.mutate()} /> : null}

      <SmartComposer directions={directions} />

      {/* Directions */}
      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-caption font-semibold uppercase tracking-wide text-ink-muted">
            Direction{directions.length > 1 ? "s" : ""}
          </h2>
          {directions.length > 0 ? (
            <span className="text-caption text-ink-muted">
              {directions.length} of {MAX_DIRECTIONS} · applied, never measured
            </span>
          ) : null}
        </div>
        {directions.length === 0 ? (
          <p className="rounded-card border border-dashed border-subtle bg-surface p-4 text-sm text-ink-muted">
            Start with a Direction — a rule for the work you take, and the work you don&apos;t.
          </p>
        ) : (
          directions.map((d) => <DirectionCard key={d.id} direction={d} />)
        )}
      </section>

      {/* The bets — minimal render (W5c builds the full board). */}
      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-caption font-semibold uppercase tracking-wide text-ink-muted">
            The bets
          </h2>
          {targets.length > 0 ? (
            <span className="text-caption text-ink-muted">
              {targets.length} of {MAX_TARGETS}
            </span>
          ) : null}
        </div>
        {targets.length === 0 ? (
          <p className="rounded-card border border-dashed border-subtle bg-surface p-4 text-sm text-ink-muted">
            No bets yet — name one above. A bet takes a number and a date.
          </p>
        ) : (
          targets.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-4 rounded-card border border-subtle bg-surface p-4 shadow-surface"
            >
              <div className="min-w-0">
                <p className="truncate text-body text-ink">{t.title}</p>
                <p className="mt-0.5 truncate text-caption text-ink-muted">{t.directionStatement}</p>
              </div>
              <span className="shrink-0 text-body tabular-nums text-ink-muted">
                {t.measureKind === "currency"
                  ? formatCurrency(t.measureTarget)
                  : t.measureKind === "shipped"
                    ? t.state === "met"
                      ? "✓ shipped"
                      : "not yet"
                    : `${t.measureCurrent ?? 0} / ${t.measureTarget}`}
              </span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

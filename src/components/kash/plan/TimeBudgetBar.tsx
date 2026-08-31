"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import type { BudgetBar } from "@/lib/budget/compute-budget-bar";
import { categorySeedLabel, categorySolidVar } from "@/lib/projects/category-tokens";
import { formatDuration } from "@/lib/time/duration";
import { useTRPC } from "@/trpc/client";

/**
 * W6 — the Budget. Today's one honest reading: the business/personal split of the
 * time you actually logged, held against the tilt you declared for the quarter.
 * Seconds are the denominator (Mission law 4), never task counts. It states and
 * never nags (law 3) — no red, no block, no "behind"; just the split, the aim, and
 * a quiet line when they diverge. `deltaPct` is left for the Week deck's off-target
 * flag (W14); this surface never reacts to it.
 */

const TILT_PRESETS = [80, 70, 60] as const;

function tiltLabel(businessPct: number): string {
  return `${businessPct} / ${100 - businessPct}`;
}

export function TimeBudgetBar({ bar }: { bar: BudgetBar }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const setTilt = useMutation(
    trpc.settings.setQuarterTilt.mutationOptions({
      onSuccess: () => {
        setEditing(false);
        void queryClient.invalidateQueries({ queryKey: trpc.budget.today.queryKey() });
        void queryClient.invalidateQueries({ queryKey: trpc.settings.get.queryKey() });
      },
    })
  );

  const declare = (businessPct: number) => setTilt.mutate(businessPct);

  const businessColor = categorySolidVar("business");
  const personalColor = categorySolidVar("personal");

  // Unset — a calm invitation, shown until the tilt is declared once for the quarter.
  if (bar.state === "unset" || editing) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="text-meta text-ink-muted">
          {editing ? "Set your tilt for the quarter" : "Set a time tilt to weigh today's split"}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {TILT_PRESETS.map((pct) => (
            <button
              key={pct}
              type="button"
              disabled={setTilt.isPending}
              onClick={() => declare(pct)}
              className="hover:bg-surface-muted rounded-full border border-subtle px-2.5 py-0.5 text-meta text-ink-muted transition-colors disabled:opacity-50"
              title={`${pct}% business · ${100 - pct}% personal`}
            >
              {tiltLabel(pct)}
            </button>
          ))}
          <span className="text-meta text-ink-faint">business / personal</span>
          {editing ? (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="ml-1 text-meta text-ink-faint underline-offset-2 hover:underline"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const tilt = bar.tiltBusinessPct ?? 0;
  // The split fills by logged seconds; an empty day shows a faint track with the
  // tilt marker alone, so the aim is visible before anything is logged.
  const businessFlex = bar.loggedSeconds > 0 ? bar.businessSeconds : 0;
  const personalFlex = bar.loggedSeconds > 0 ? bar.personalSeconds : 0;

  const caption =
    bar.state === "empty"
      ? `Nothing logged yet · aiming ${tilt}% business`
      : `${bar.actualBusinessPct}% business today · aimed ${tilt}%`;

  const freeLine =
    bar.freeMinutes !== null
      ? `${formatDuration(bar.freeMinutes * 60)} free${
          bar.bookedMinutes ? ` · ${formatDuration(bar.bookedMinutes * 60)} booked` : ""
        }`
      : null;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="bg-surface-muted relative flex h-2 min-w-0 flex-1 overflow-hidden rounded-full"
          role="img"
          aria-label={
            bar.state === "empty"
              ? `No time logged today; aiming ${tilt}% business`
              : `Today: ${bar.actualBusinessPct}% business, aim ${tilt}%`
          }
        >
          {businessFlex > 0 ? (
            <span
              className="transition-[flex-grow] duration-medium ease-move motion-reduce:transition-none"
              style={{
                flexGrow: businessFlex,
                backgroundColor: businessColor,
                boxShadow: "0 0 0 1px var(--mark-ring)",
              }}
              title={`${categorySeedLabel("business")} · ${formatDuration(bar.businessSeconds)}`}
            />
          ) : null}
          {personalFlex > 0 ? (
            <span
              className="transition-[flex-grow] duration-medium ease-move motion-reduce:transition-none"
              style={{
                flexGrow: personalFlex,
                backgroundColor: personalColor,
                boxShadow: "0 0 0 1px var(--mark-ring)",
              }}
              title={`${categorySeedLabel("personal")} · ${formatDuration(bar.personalSeconds)}`}
            />
          ) : null}
          {/* The declared tilt: a quiet marker, never an alarm line. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 w-px bg-ink"
            style={{ left: `${tilt}%`, opacity: 0.55 }}
            title={`Tilt ${tiltLabel(tilt)}`}
          />
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="shrink-0 text-meta text-ink-faint underline-offset-2 hover:text-ink-muted hover:underline"
          title="Change your quarter tilt"
        >
          tilt {tiltLabel(tilt)}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <ul className="flex flex-wrap gap-x-3 gap-y-1" aria-hidden>
          <li className="flex items-center gap-1.5 text-meta">
            <span
              className="size-2 shrink-0 rounded-sm shadow-[0_0_0_1px_var(--mark-ring)]"
              style={{ backgroundColor: businessColor }}
            />
            <span className="text-ink-muted">
              {categorySeedLabel("business")} {formatDuration(bar.businessSeconds)}
            </span>
          </li>
          <li className="flex items-center gap-1.5 text-meta">
            <span
              className="size-2 shrink-0 rounded-sm shadow-[0_0_0_1px_var(--mark-ring)]"
              style={{ backgroundColor: personalColor }}
            />
            <span className="text-ink-muted">
              {categorySeedLabel("personal")} {formatDuration(bar.personalSeconds)}
            </span>
          </li>
        </ul>
        <p className="text-meta text-ink-muted" role="note">
          {caption}
        </p>
        {freeLine ? <p className="text-meta text-ink-faint">{freeLine}</p> : null}
      </div>
    </div>
  );
}

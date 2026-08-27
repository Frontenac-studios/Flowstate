"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import Input from "@/components/kash/ui/Input";
import Select from "@/components/kash/ui/Select";
import { useTRPC } from "@/trpc/client";
import { routeComposerInput } from "@/lib/quarter/parse-composer";

type Direction = { id: string; statement: string };
type Bet = {
  id: string;
  title: string;
  measureKind: "currency" | "count" | "shipped";
  measureTarget: number;
  current: number;
  isMet: boolean;
};
type MeasureKind = "currency" | "count" | "shipped";

const MAX_TARGETS = 3;

/**
 * The one smart composer (W5, §13 Q2). A single field routes number+date → a bet
 * (revealing kind / measure / parent Direction inline for confirmation) else a
 * Direction. The reveal always lets you flip the type, so a misroute is one click
 * to fix rather than a dead end.
 */
export default function SmartComposer({
  directions,
  bets,
}: {
  directions: Direction[];
  bets: Bet[];
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [text, setText] = useState("");
  const [capPanel, setCapPanel] = useState(false);
  const [draft, setDraft] = useState<null | {
    type: "direction" | "target";
    measureKind: MeasureKind;
    measureText: string;
    directionId: string;
  }>(null);
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => {
    void queryClient.invalidateQueries(trpc.directions.list.pathFilter());
    void queryClient.invalidateQueries(trpc.targets.list.pathFilter());
  };

  const createDirection = useMutation(
    trpc.directions.create.mutationOptions({
      onSuccess: () => {
        invalidate();
        reset();
      },
      onError: (e) => setError(e.message),
    })
  );
  const createTarget = useMutation(
    trpc.targets.create.mutationOptions({
      onSuccess: () => {
        invalidate();
        reset();
      },
      onError: (e) => setError(e.message),
    })
  );
  const retireBet = useMutation(
    trpc.targets.retire.mutationOptions({ onSuccess: () => invalidate() })
  );

  function reset() {
    setText("");
    setDraft(null);
    setError(null);
    setCapPanel(false);
  }

  function parse() {
    const guess = routeComposerInput(text);
    if (!guess) return;
    setError(null);
    if (guess.kind === "direction") {
      setDraft({ type: "direction", measureKind: "count", measureText: "", directionId: "" });
    } else {
      setDraft({
        type: "target",
        measureKind: guess.measureKind,
        measureText:
          guess.measureKind === "currency"
            ? String(guess.measureTarget / 100)
            : String(guess.measureTarget),
        directionId: directions[0]?.id ?? "",
      });
    }
  }

  const measureTargetValue = useMemo(() => {
    if (!draft || draft.type !== "target") return 0;
    if (draft.measureKind === "shipped") return 1;
    const n = Number(draft.measureText.replace(/[$,\s]/g, ""));
    if (!Number.isFinite(n) || n < 0) return NaN;
    return draft.measureKind === "currency" ? Math.round(n * 100) : Math.round(n);
  }, [draft]);

  function confirm() {
    if (!draft) return;
    setError(null);
    if (draft.type === "direction") {
      createDirection.mutate({ statement: text.trim() });
      return;
    }
    if (!draft.directionId) {
      setError("Pick which Direction this bet serves.");
      return;
    }
    if (Number.isNaN(measureTargetValue)) {
      setError("That measure isn't a number.");
      return;
    }
    // Cap is a moment, not a toast: a fourth bet opens the retire-one panel
    // instead of failing silently (§13 / artboard 4).
    if (bets.length >= MAX_TARGETS) {
      setCapPanel(true);
      return;
    }
    createTarget.mutate({
      directionId: draft.directionId,
      title: text.trim(),
      measureKind: draft.measureKind,
      measureTarget: measureTargetValue,
    });
  }

  const pending = createDirection.isPending || createTarget.isPending;
  const noDirections = directions.length === 0;

  return (
    <section className="rounded-card border border-subtle bg-surface p-4 shadow-surface">
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (draft) setDraft(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !draft) parse();
          }}
          placeholder="Set a direction, or name a bet…"
          aria-label="Add a direction or a bet"
          className="flex-1 text-sm"
        />
        {!draft ? (
          <button
            type="button"
            onClick={parse}
            disabled={!text.trim()}
            className="shrink-0 rounded-control bg-ink px-3 py-1.5 text-xs font-medium text-surface transition hover:opacity-90 disabled:opacity-50"
          >
            Next
          </button>
        ) : null}
      </div>

      {capPanel ? (
        <div className="mt-3 flex flex-col gap-3 rounded-control border border-subtle bg-surface-2 p-3">
          <div>
            <p className="text-sm font-medium text-ink">You already have three bets.</p>
            <p className="mt-0.5 text-caption text-ink-muted">
              A fourth means closing a door on one. Retire one to make room.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {bets.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between gap-3 rounded-control border border-subtle bg-surface p-2.5"
              >
                <span className="min-w-0 truncate text-sm text-ink">{b.title}</span>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-caption tabular-nums text-ink-muted">
                    {b.measureKind === "shipped"
                      ? b.isMet
                        ? "✓"
                        : "in progress"
                      : b.measureKind === "currency"
                        ? `$${Math.round(b.current / 100).toLocaleString()} / $${Math.round(b.measureTarget / 100).toLocaleString()}`
                        : `${b.current} / ${b.measureTarget}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      retireBet.mutate({ id: b.id });
                      setCapPanel(false);
                    }}
                    className="text-caption font-medium text-ink-muted transition hover:text-critical"
                  >
                    Retire
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={reset}
              className="rounded-control px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : draft ? (
        <div className="mt-3 flex flex-col gap-3 rounded-control border border-subtle bg-surface-2 p-3">
          {/* Type toggle — the routing guess, confirmable. */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-ink-muted">This is a</span>
            {(["direction", "target"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setDraft({ ...draft, type: t })}
                className={`rounded-pill px-2.5 py-1 font-medium transition ${
                  draft.type === t
                    ? "bg-ink text-surface"
                    : "border border-subtle bg-surface text-ink-muted hover:text-ink"
                }`}
              >
                {t === "direction" ? "Direction" : "bet"}
              </button>
            ))}
          </div>

          {draft.type === "target" ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  aria-label="Measure kind"
                  value={draft.measureKind}
                  onChange={(e) =>
                    setDraft({ ...draft, measureKind: e.target.value as MeasureKind })
                  }
                  className="w-auto text-sm"
                >
                  <option value="currency">$ booked</option>
                  <option value="count">count</option>
                  <option value="shipped">shipped</option>
                </Select>
                {draft.measureKind !== "shipped" ? (
                  <Input
                    value={draft.measureText}
                    onChange={(e) => setDraft({ ...draft, measureText: e.target.value })}
                    placeholder={draft.measureKind === "currency" ? "$ amount" : "how many"}
                    aria-label="Measure target"
                    className="w-32 text-sm"
                  />
                ) : (
                  <span className="text-caption text-ink-muted">a milestone — done or not</span>
                )}
                <span className="rounded-pill bg-surface px-2 py-0.5 text-caption text-ink-muted">
                  this quarter
                </span>
              </div>

              {noDirections ? (
                <p className="text-caption text-critical">
                  Add a Direction first — every bet serves one.
                </p>
              ) : directions.length === 1 ? (
                <p className="text-caption text-ink-muted">
                  Serves: <span className="text-ink">{directions[0]!.statement}</span>
                </p>
              ) : (
                <Select
                  aria-label="Parent direction"
                  value={draft.directionId}
                  onChange={(e) => setDraft({ ...draft, directionId: e.target.value })}
                  className="text-sm"
                >
                  <option value="">Which direction does this serve?</option>
                  {directions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.statement}
                    </option>
                  ))}
                </Select>
              )}
            </>
          ) : null}

          {error ? <p className="text-caption text-critical">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded-control px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={pending || (draft.type === "target" && noDirections)}
              className="rounded-control bg-ink px-3 py-1.5 text-xs font-medium text-surface transition hover:opacity-90 disabled:opacity-50"
            >
              {draft.type === "direction" ? "Add direction" : "Add bet"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

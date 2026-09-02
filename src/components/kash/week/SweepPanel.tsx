"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { useOptionalToast } from "@/components/kash/ui/ToastProvider";
import type { SweepAltitude } from "@/lib/sweep/sweep";
import { useTRPC } from "@/trpc/client";

type Ruling = "keep" | "park" | "drop" | "lost" | "delete";

const ALTITUDE_CHIP: Record<SweepAltitude, string> = {
  task: "Task",
  project: "Project",
  target: "Target",
};

function rulingOptions(
  altitude: SweepAltitude,
  isDeal: boolean
): { value: Ruling; label: string }[] {
  // A quiet DEAL (W10f) isn't dropped — it either went away (record the loss, keep
  // the evidence) or was never real (delete it). Parking a deal means nothing.
  if (isDeal) {
    return [
      { value: "keep", label: "Keep" },
      { value: "lost", label: "Lost" },
      { value: "delete", label: "Delete" },
    ];
  }
  // A target has no Backlog home, so it takes keep/drop only.
  const base: { value: Ruling; label: string }[] = [{ value: "keep", label: "Keep" }];
  if (altitude !== "target") base.push({ value: "park", label: "Park" });
  base.push({ value: "drop", label: "Drop" });
  return base;
}

function Segmented({
  value,
  options,
  onChange,
}: {
  value: Ruling;
  options: { value: Ruling; label: string }[];
  onChange: (v: Ruling) => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-pill border border-subtle">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          tabIndex={-1}
          onClick={() => onChange(o.value)}
          className={`px-2.5 py-1 text-caption font-medium transition ${
            value === o.value ? "bg-ink text-surface" : "bg-surface text-ink-muted hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * W7 — the Sweep, on Week. What has gone quiet at three altitudes, ruled in one
 * keyboard pass. Mirrors the Quarter review: a quiet entry when there's something to
 * sweep, opening an in-place panel pre-answered to **keep** (the safe no-op), so you
 * only touch what you mean to drop or park. Keep buys a month, so the list shrinks
 * week over week rather than nagging. Nothing is auto-dropped.
 *
 * Keyboard: ↑/↓ move, k keep · p park · d drop (each advances to the next), ↵ sweeps.
 */
export function SweepPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const toast = useOptionalToast();

  const { data: draft } = useQuery(trpc.sweep.draft.queryOptions());
  const [rulings, setRulings] = useState<Record<string, Ruling>>({});
  const [focus, setFocus] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const items = draft?.items ?? [];

  const close = useMutation(
    trpc.sweep.close.mutationOptions({
      onSuccess: (counts) => {
        void queryClient.invalidateQueries(trpc.sweep.draft.pathFilter());
        void queryClient.invalidateQueries(trpc.tasks.listIncomplete.pathFilter());
        void queryClient.invalidateQueries(trpc.projects.list.pathFilter());
        void queryClient.invalidateQueries(trpc.targets.list.pathFilter());
        void queryClient.invalidateQueries(trpc.abyss.list.pathFilter());
        void queryClient.invalidateQueries(trpc.sourcing.listLeads.pathFilter());
        void queryClient.invalidateQueries(trpc.sourcing.listClosed.pathFilter());
        onClose();
        const parts = [
          `${counts.kept} kept`,
          `${counts.parked} parked`,
          `${counts.dropped} dropped`,
        ];
        if (counts.lost > 0) parts.push(`${counts.lost} lost`);
        if (counts.deleted > 0) parts.push(`${counts.deleted} deleted`);
        toast?.toast({ message: `Swept — ${parts.join(", ")}.` });
      },
    })
  );

  // Fresh open: every item back to the pre-answered "keep" (rulings start empty and
  // default to keep), focus the top, and take keyboard focus for the ritual.
  useEffect(() => {
    if (!open) return;
    setRulings({});
    setFocus(0);
    panelRef.current?.focus();
  }, [open]);

  function rule(id: string, altitude: SweepAltitude, isDeal: boolean, r: Ruling) {
    if (altitude === "target" && r === "park") return;
    // The two rulings are mutually exclusive by item type, in both directions.
    if (isDeal && (r === "drop" || r === "park")) return;
    if (!isDeal && (r === "lost" || r === "delete")) return;
    setRulings((prev) => ({ ...prev, [id]: r }));
  }

  function submit() {
    close.mutate({
      rulings: items.map((i) => ({
        altitude: i.altitude,
        id: i.id,
        ruling: rulings[i.id] ?? "keep",
      })),
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (items.length === 0) return;
    if (e.key === "ArrowDown") {
      setFocus((f) => Math.min(items.length - 1, f + 1));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setFocus((f) => Math.max(0, f - 1));
      e.preventDefault();
    } else if (e.key === "k" || e.key === "d" || e.key === "p" || e.key === "l" || e.key === "x") {
      const cur = items[focus];
      if (cur) {
        const isDeal = cur.isDeal === true;
        const ruling: Ruling =
          e.key === "k"
            ? "keep"
            : e.key === "l"
              ? "lost"
              : e.key === "x"
                ? "delete"
                : e.key === "d"
                  ? // On a deal, "drop" is ambiguous by design — d marks it lost, the
                    // outcome that keeps the evidence. x is the destructive one.
                    isDeal
                    ? "lost"
                    : "drop"
                  : "park";
        rule(cur.id, cur.altitude, isDeal, ruling);
        setFocus((f) => Math.min(items.length - 1, f + 1));
      }
      e.preventDefault();
    } else if (e.key === "Enter") {
      submit();
      e.preventDefault();
    }
  }

  // Controlled by the deck's "Gone quiet" cell; nothing to rule when closed or empty.
  if (!open || !draft || draft.totalStale === 0) return null;

  return (
    <section
      ref={panelRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="flex flex-col gap-3 rounded-card border border-subtle bg-surface p-4 shadow-surface outline-none"
      aria-label="The Sweep"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-body font-medium text-ink">
          Gone quiet — {draft.totalStale} at three altitudes
        </h2>
        <span className="shrink-0 text-caption text-ink-faint">
          ↑↓ move · k keep · p park · d drop · x delete a deal · ↵ sweep
        </span>
      </div>

      <ul className="flex flex-col gap-1">
        {items.map((item, idx) => {
          const focused = idx === focus;
          return (
            <li
              key={`${item.altitude}:${item.id}`}
              onMouseEnter={() => setFocus(idx)}
              className={`flex items-center justify-between gap-3 rounded-control px-2 py-1.5 ${
                focused ? "bg-surface-muted ring-subtle ring-1 ring-inset" : ""
              }`}
            >
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="shrink-0 rounded-pill border border-subtle px-1.5 py-0.5 text-meta text-ink-faint">
                  {item.isDeal ? "Deal" : ALTITUDE_CHIP[item.altitude]}
                </span>
                <span className="min-w-0 truncate text-sm text-ink">{item.title}</span>
                <span className="shrink-0 text-caption text-ink-faint">
                  {item.staleDays}d quiet
                </span>
              </span>
              <Segmented
                value={rulings[item.id] ?? "keep"}
                options={rulingOptions(item.altitude, item.isDeal === true)}
                onChange={(v) => rule(item.id, item.altitude, item.isDeal === true, v)}
              />
            </li>
          );
        })}
      </ul>

      {draft.remaining > 0 ? (
        <p className="text-caption text-ink-faint">
          +{draft.remaining} more gone quiet — rule these first; the rest surface next week.
        </p>
      ) : null}

      <div className="mt-1 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-control px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:text-ink"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={close.isPending}
          className="rounded-control bg-ink px-3 py-1.5 text-xs font-medium text-surface transition hover:opacity-90 disabled:opacity-50"
        >
          Sweep
        </button>
      </div>
    </section>
  );
}

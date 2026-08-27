"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import Input from "@/components/kash/ui/Input";
import Select from "@/components/kash/ui/Select";
import { Check, RefreshCw } from "@/components/kash/ui/icon";
import { measureProgress } from "@/lib/quarter/derive-measure";
import { useTRPC } from "@/trpc/client";

type MeasureKind = "currency" | "count" | "shipped";
type MeasureSource = "auto" | "manual";
type DerivationKey = "money_booked" | "clients_signed" | "milestones_shipped";

export type BetView = {
  id: string;
  directionStatement: string;
  title: string;
  horizon: string;
  measureKind: MeasureKind;
  measureSource: MeasureSource;
  derivationKey: DerivationKey | null;
  measureTarget: number;
  current: number;
  projectsServing: number;
  isMet: boolean;
  state: string;
};

/** "$40k" / "$1.5k" / "$900" from cents. */
function money(cents: number): string {
  const d = cents / 100;
  if (d >= 1000) return `$${(d / 1000).toFixed(d % 1000 === 0 ? 0 : 1)}k`;
  return `$${d.toLocaleString()}`;
}

function formatMeasure(kind: MeasureKind, value: number): string {
  return kind === "currency" ? money(value) : String(value);
}

/**
 * One bet on the Quarter board (W5c, §3). A title, its measure on the right, a
 * thin progress bar (currency/count) or a ✓ state (shipped/met), a chip row
 * (Direction · horizon · auto/manual), and a movement line. A bet that has moved
 * nothing says so in grey — never crimson. Editable in place; retire keeps it in
 * the quarter's record.
 */
export default function TargetCard({ bet }: { bet: BetView }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const invalidate = () => queryClient.invalidateQueries(trpc.targets.list.pathFilter());
  const update = useMutation(
    trpc.targets.update.mutationOptions({
      onSuccess: () => {
        void invalidate();
        setEditing(false);
      },
    })
  );
  const setCurrent = useMutation(
    trpc.targets.setCurrent.mutationOptions({ onSuccess: () => void invalidate() })
  );
  const retire = useMutation(
    trpc.targets.retire.mutationOptions({ onSuccess: () => void invalidate() })
  );

  const progress = measureProgress(bet.current, bet.measureTarget);
  const isShipped = bet.measureKind === "shipped";

  if (editing)
    return (
      <EditForm
        bet={bet}
        pending={update.isPending}
        onCancel={() => setEditing(false)}
        onSave={(patch) => update.mutate({ id: bet.id, ...patch })}
      />
    );

  return (
    <div
      className={`group rounded-card border bg-surface p-4 shadow-surface ${
        bet.isMet ? "border-accent/40" : "border-subtle"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-body font-medium text-ink">{bet.title}</p>
        </div>
        <div className="shrink-0 text-right">
          {isShipped ? (
            bet.isMet ? (
              <span className="inline-flex items-center gap-1 text-body font-medium text-accent">
                <Check size={15} /> shipped
              </span>
            ) : (
              <span className="text-body text-ink-muted">not yet</span>
            )
          ) : (
            <span className="text-body tabular-nums text-ink">
              {formatMeasure(bet.measureKind, bet.current)}
              <span className="text-ink-muted">
                {" "}
                / {formatMeasure(bet.measureKind, bet.measureTarget)}
              </span>
            </span>
          )}
        </div>
      </div>

      {!isShipped ? (
        <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-surface-2">
          <div
            className={`h-full rounded-pill ${bet.isMet ? "bg-accent" : "bg-ink"}`}
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      ) : null}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className="max-w-[16rem] truncate rounded-pill bg-surface-2 px-2 py-0.5 text-caption text-ink-muted">
          {bet.directionStatement}
        </span>
        {bet.horizon !== "quarter" ? (
          <span className="rounded-pill bg-surface-2 px-2 py-0.5 text-caption text-ink-muted">
            {bet.horizon}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1 rounded-pill bg-surface-2 px-2 py-0.5 text-caption text-ink-muted">
          {bet.measureSource === "auto" ? (
            <>
              <RefreshCw size={11} /> auto
            </>
          ) : (
            "manual"
          )}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <p className="text-caption text-ink-muted">
          {bet.projectsServing > 0
            ? `${bet.projectsServing} project${bet.projectsServing === 1 ? "" : "s"} serving`
            : "No projects serving yet"}
        </p>
        <div className="flex items-center gap-3 opacity-0 transition group-hover:opacity-100">
          {bet.measureSource === "manual" && !isShipped ? (
            <ManualProgress
              bet={bet}
              onLog={(current) => setCurrent.mutate({ id: bet.id, current })}
            />
          ) : null}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-caption font-medium text-ink-muted transition hover:text-ink"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => retire.mutate({ id: bet.id })}
            disabled={retire.isPending}
            className="text-caption font-medium text-ink-muted transition hover:text-critical disabled:opacity-50"
          >
            Retire
          </button>
        </div>
      </div>
    </div>
  );
}

function ManualProgress({ bet, onLog }: { bet: BetView; onLog: (current: number) => void }) {
  const [value, setValue] = useState(
    bet.measureKind === "currency" ? String(bet.current / 100) : String(bet.current)
  );
  return (
    <span className="flex items-center gap-1">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Progress so far"
        className="w-20 text-xs"
      />
      <button
        type="button"
        onClick={() => {
          const n = Number(value.replace(/[$,\s]/g, ""));
          if (!Number.isFinite(n) || n < 0) return;
          onLog(bet.measureKind === "currency" ? Math.round(n * 100) : Math.round(n));
        }}
        className="text-caption font-medium text-accent transition hover:opacity-80"
      >
        Log
      </button>
    </span>
  );
}

type EditPatch = {
  title: string;
  measureKind: MeasureKind;
  measureTarget: number;
  measureSource: MeasureSource;
  derivationKey: DerivationKey | null;
};

function EditForm({
  bet,
  pending,
  onCancel,
  onSave,
}: {
  bet: BetView;
  pending: boolean;
  onCancel: () => void;
  onSave: (patch: EditPatch) => void;
}) {
  const [title, setTitle] = useState(bet.title);
  const [kind, setKind] = useState<MeasureKind>(bet.measureKind);
  const [source, setSource] = useState<MeasureSource>(bet.measureSource);
  const [derivation, setDerivation] = useState<DerivationKey>(bet.derivationKey ?? "money_booked");
  const [targetText, setTargetText] = useState(
    bet.measureKind === "currency" ? String(bet.measureTarget / 100) : String(bet.measureTarget)
  );

  const submit = () => {
    const raw = Number(targetText.replace(/[$,\s]/g, ""));
    const measureTarget =
      kind === "shipped" ? 1 : kind === "currency" ? Math.round(raw * 100) : Math.round(raw);
    onSave({
      title: title.trim(),
      measureKind: kind,
      measureTarget: Number.isFinite(measureTarget) ? measureTarget : 0,
      measureSource: source,
      derivationKey: source === "auto" ? derivation : null,
    });
  };

  return (
    <div className="rounded-card border border-subtle bg-surface p-4 shadow-surface">
      <div className="flex flex-col gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Bet title"
          className="text-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Measure kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as MeasureKind)}
            className="w-auto text-sm"
          >
            <option value="currency">$ booked</option>
            <option value="count">count</option>
            <option value="shipped">shipped</option>
          </Select>
          {kind !== "shipped" ? (
            <Input
              value={targetText}
              onChange={(e) => setTargetText(e.target.value)}
              aria-label="Target"
              className="w-28 text-sm"
            />
          ) : null}
          <Select
            aria-label="Measure source"
            value={source}
            onChange={(e) => setSource(e.target.value as MeasureSource)}
            className="w-auto text-sm"
          >
            <option value="manual">manual</option>
            <option value="auto">auto</option>
          </Select>
          {source === "auto" ? (
            <Select
              aria-label="Derivation"
              value={derivation}
              onChange={(e) => setDerivation(e.target.value as DerivationKey)}
              className="w-auto text-sm"
            >
              <option value="money_booked">$ booked (Money)</option>
              <option value="clients_signed">clients signed</option>
              <option value="milestones_shipped">milestones shipped</option>
            </Select>
          ) : null}
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-control px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !title.trim()}
            className="rounded-control bg-ink px-3 py-1.5 text-xs font-medium text-surface transition hover:opacity-90 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import Button from "@/components/kash/ui/Button";
import Input from "@/components/kash/ui/Input";
import Select from "@/components/kash/ui/Select";
import type { ConstraintSeverity, ConstraintType } from "@/lib/about-me/constants";
import {
  type ConstraintSchedule,
  CONSTRAINT_TYPE_META,
  minutesToTimeInput,
  timeInputToMinutes,
  WEEKDAY_TOGGLES,
} from "@/lib/about-me/constraints";
import { cn } from "@/lib/cn";
import { useTRPC } from "@/trpc/client";

export type ConstraintDraft = {
  id?: string;
  type: ConstraintType;
  label: string;
  schedule: ConstraintSchedule | null;
  severity: ConstraintSeverity;
};

export default function ConstraintForm({
  initial,
  onClose,
}: {
  initial: ConstraintDraft;
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [type, setType] = useState<ConstraintType>(initial.type);
  const [label, setLabel] = useState(initial.label);
  const [severity, setSeverity] = useState<ConstraintSeverity>(initial.severity);
  const [days, setDays] = useState<Set<number>>(new Set(initial.schedule?.days ?? []));
  const [start, setStart] = useState(minutesToTimeInput(initial.schedule?.startMin));
  const [end, setEnd] = useState(minutesToTimeInput(initial.schedule?.endMin));
  const [error, setError] = useState<string | null>(null);

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: trpc.aboutMe.constraints.list.queryKey() });

  const addMutation = useMutation(
    trpc.aboutMe.constraints.add.mutationOptions({
      onSuccess: () => {
        invalidate();
        onClose();
      },
      onError: (e) => setError(e.message),
    })
  );
  const updateMutation = useMutation(
    trpc.aboutMe.constraints.update.mutationOptions({
      onSuccess: () => {
        invalidate();
        onClose();
      },
      onError: (e) => setError(e.message),
    })
  );

  const busy = addMutation.isPending || updateMutation.isPending;

  const toggleDay = (iso: number) => {
    setDays((prev) => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });
  };

  const buildSchedule = (): ConstraintSchedule | null => {
    const startMin = timeInputToMinutes(start);
    const endMin = timeInputToMinutes(end);
    if (days.size === 0 && startMin == null && endMin == null) return null;
    return {
      days: Array.from(days).sort((a, b) => a - b),
      ...(startMin != null ? { startMin } : {}),
      ...(endMin != null ? { endMin } : {}),
    };
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed || busy) return;
    setError(null);
    const schedule = buildSchedule();
    if (initial.id) {
      updateMutation.mutate({ id: initial.id, type, label: trimmed, schedule, severity });
    } else {
      addMutation.mutate({ type, label: trimmed, schedule, severity });
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-row border border-border bg-surface-2 p-3"
      aria-label={initial.id ? "Edit constraint" : "Add constraint"}
    >
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label — e.g. School run, No meetings before 11am"
        aria-label="Constraint label"
        autoFocus
        className="mb-3 w-full text-body"
      />

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-meta text-ink-muted">
          Kind
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as ConstraintType)}
            aria-label="Constraint kind"
            className="text-body"
          >
            {CONSTRAINT_TYPE_META.map((m) => (
              <option key={m.type} value={m.type}>
                {m.title}
              </option>
            ))}
          </Select>
        </label>

        <div
          className="inline-flex overflow-hidden rounded-control border border-border"
          role="group"
          aria-label="Severity"
        >
          {(["hard", "soft"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSeverity(s)}
              aria-pressed={severity === s}
              className={cn(
                "px-3 py-1.5 text-meta capitalize transition",
                severity === s
                  ? "bg-ink text-accent-on"
                  : "bg-surface text-ink-muted hover:text-ink"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <span className="mb-1.5 block text-meta text-ink-muted">Days (optional)</span>
        <div className="flex gap-1">
          {WEEKDAY_TOGGLES.map((d) => (
            <button
              key={d.iso}
              type="button"
              onClick={() => toggleDay(d.iso)}
              aria-pressed={days.has(d.iso)}
              aria-label={`Day ${d.iso}`}
              className={cn(
                "h-7 w-7 rounded-chip border text-caption transition",
                days.has(d.iso)
                  ? "border-ink bg-ink text-accent-on"
                  : "border-border text-ink-muted hover:border-ink hover:text-ink"
              )}
            >
              {d.short}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-meta text-ink-muted">
          From
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            aria-label="Start time"
            className="rounded-control border border-border bg-surface px-2 py-1 text-body text-ink outline-none focus:shadow-[0_0_0_2px_var(--focus-ring)]"
          />
        </label>
        <label className="flex items-center gap-2 text-meta text-ink-muted">
          To
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            aria-label="End time"
            className="rounded-control border border-border bg-surface px-2 py-1 text-body text-ink outline-none focus:shadow-[0_0_0_2px_var(--focus-ring)]"
          />
        </label>
      </div>

      {error ? (
        <p className="mb-2 text-meta text-critical" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={busy || label.trim().length === 0} className="text-body">
          {initial.id ? "Save" : "Add"}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose} className="text-body">
          Cancel
        </Button>
      </div>
    </form>
  );
}

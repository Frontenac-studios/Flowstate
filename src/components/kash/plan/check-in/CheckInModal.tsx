"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import Button from "@/components/kash/ui/Button";
import {
  clearCheckInSnooze,
  markCheckInCompleted,
  readCheckInStorage,
  setCheckInCadence,
  setCheckInSnoozeUntil,
  type CheckInCadence,
} from "@/lib/planning/check-in-storage";
import { addDays, startOfLocalDay, toISODateString } from "@/lib/dates/local-day";
import {
  checkInDepthLabel,
  checkInScopeKey,
  type CheckInDepth,
  type CheckInScope,
} from "@/lib/planning/check-in";
import { useTRPC } from "@/trpc/client";

import CheckInGhosts from "./CheckInGhosts";
import CheckInScopePicker from "./CheckInScopePicker";

type Props = {
  open: boolean;
  year: number;
  month?: number;
  quarter?: number;
  weekStart?: string;
  onClose: () => void;
  onCompleted: () => void;
};

type Step = "scope" | "conversation";

const CADENCE_OPTIONS: { value: CheckInCadence; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "off", label: "Off" },
];

function mondayOfWeek(date: Date): string {
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return toISODateString(addDays(startOfLocalDay(date), mondayOffset));
}

function resolveScopeContext(
  depth: CheckInDepth,
  year: number,
  month?: number,
  quarter?: number,
  weekStart?: string
): CheckInScope {
  const now = new Date();
  const resolvedMonth = month ?? now.getMonth() + 1;
  const resolvedQuarter = quarter ?? Math.ceil(resolvedMonth / 3);
  const resolvedWeekStart = weekStart ?? mondayOfWeek(now);

  return buildScope(depth, year, resolvedMonth, resolvedQuarter, resolvedWeekStart);
}

function buildScope(
  depth: CheckInDepth,
  year: number,
  month?: number,
  quarter?: number,
  weekStart?: string
): CheckInScope {
  return {
    depth,
    year,
    month: depth === "month" || depth === "week" ? month : undefined,
    quarter: depth === "quarter" || depth === "month" || depth === "week" ? quarter : undefined,
    weekStart: depth === "week" ? weekStart : undefined,
  };
}

export default function CheckInModal({
  open,
  year,
  month,
  quarter,
  weekStart,
  onClose,
  onCompleted,
}: Props) {
  const trpc = useTRPC();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<Step>("scope");
  const [depth, setDepth] = useState<CheckInDepth | null>(null);
  const [cadence, setCadence] = useState<CheckInCadence>("weekly");
  const [scopeKey, setScopeKey] = useState<string | null>(null);
  const [mockReply, setMockReply] = useState<string | null>(null);

  const suggestMutation = useMutation(
    trpc.planning.suggestCheckIn.mutationOptions({
      onError: () => {
        setMockReply("Couldn't load suggestions right now — try again in a moment.");
        setStep("conversation");
      },
    })
  );

  useEffect(() => {
    if (!open) return;
    const storage = readCheckInStorage();
    setCadence(storage.cadence);
    setStep("scope");
    setDepth(null);
    setScopeKey(null);
    setMockReply(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const handleCadenceChange = useCallback((next: CheckInCadence) => {
    setCadence(next);
    setCheckInCadence(next);
  }, []);

  const handleSnooze = useCallback(() => {
    const until = new Date(Date.now() + 7 * 86_400_000);
    setCheckInSnoozeUntil(until.toISOString());
    onClose();
  }, [onClose]);

  const handleGenerate = useCallback(async () => {
    if (!depth) return;
    const scope = resolveScopeContext(depth, year, month, quarter, weekStart);
    const key = checkInScopeKey(scope);
    setScopeKey(key);

    const rows = await suggestMutation.mutateAsync({
      depth: scope.depth,
      year: scope.year,
      month: scope.month,
      quarter: scope.quarter,
      weekStart: scope.weekStart,
      tzOffsetMinutes: new Date().getTimezoneOffset(),
    });

    setMockReply(
      rows.length > 0
        ? `Here are ${rows.length} small next steps for ${checkInDepthLabel(depth).toLowerCase()}. Stage what feels right, then Apply.`
        : `Nothing urgent for ${checkInDepthLabel(depth).toLowerCase()} — you're in good shape.`
    );
    setStep("conversation");
  }, [depth, year, month, quarter, weekStart, suggestMutation]);

  const handleDone = useCallback(() => {
    markCheckInCompleted();
    clearCheckInSnooze();
    onCompleted();
    onClose();
  }, [onClose, onCompleted]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-black/20 p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(90vh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-card border border-border bg-surface shadow-overlay"
      >
        <header className="border-ink/10 flex items-start justify-between gap-3 border-b px-5 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-ink">
              Planning check-in
            </h2>
            <p className="mt-0.5 text-caption text-ink-muted">
              Small bites — propose, confirm, move on (PM-7).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close check-in"
            className="hover:bg-ink/5 shrink-0 rounded px-2 py-1 text-ink-muted"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="flex flex-wrap items-center gap-2 text-caption">
            <span className="text-ink-muted">Gentle cadence:</span>
            {CADENCE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={cadence === option.value}
                onClick={() => handleCadenceChange(option.value)}
                className={`rounded-pill border px-2.5 py-0.5 transition duration-short ${
                  cadence === option.value
                    ? "border-ink bg-surface-2 font-medium text-ink"
                    : "border-subtle text-ink-muted hover:text-ink"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {step === "scope" ? (
            <>
              <CheckInScopePicker value={depth} onChange={setDepth} />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={!depth || suggestMutation.isPending}
                  onClick={() => void handleGenerate()}
                >
                  {suggestMutation.isPending ? "Thinking…" : "Start check-in"}
                </Button>
                <Button type="button" variant="ghost" onClick={handleSnooze}>
                  Snooze a week
                </Button>
              </div>
            </>
          ) : (
            <>
              {mockReply ? (
                <div className="rounded-card border border-subtle bg-surface-2 px-4 py-3 text-sm text-ink">
                  <span className="mr-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
                    ✦ Kash
                  </span>
                  {mockReply}
                </div>
              ) : null}
              {scopeKey ? <CheckInGhosts scopeKey={scopeKey} /> : null}
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={handleDone}>
                  Done for now
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setStep("scope");
                    setMockReply(null);
                    setScopeKey(null);
                  }}
                >
                  Different scope
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

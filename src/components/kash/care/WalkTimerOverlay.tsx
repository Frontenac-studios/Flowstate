"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

import Button from "@/components/kash/ui/Button";
import { useTRPC } from "@/trpc/client";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Walk duration in minutes (default 15). */
  durationMinutes?: number;
};

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Lightweight walk timer — logs care_event on complete (SC-1). */
export function WalkTimerOverlay({ open, onClose, durationMinutes = 15 }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const totalSeconds = durationMinutes * 60;

  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [done, setDone] = useState(false);

  const logWalk = useMutation(
    trpc.care.logQuickSelfCare.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.care.getGardenState.queryKey() });
        void queryClient.invalidateQueries({ queryKey: trpc.care.getStatsSummary.queryKey() });
      },
    })
  );

  const reset = useCallback(() => {
    setRunning(false);
    setSecondsLeft(totalSeconds);
    setDone(false);
  }, [totalSeconds]);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  useEffect(() => {
    if (!running || secondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, secondsLeft]);

  useEffect(() => {
    if (!running || secondsLeft > 0 || done) return;
    logWalk.mutate({ kind: "walk", durationMinutes });
    setRunning(false);
    setDone(true);
  }, [done, durationMinutes, logWalk, running, secondsLeft]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-overlay flex items-center justify-center bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-4 backdrop-blur-sm"
      role="dialog"
      aria-label="Walk timer"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-card border border-subtle bg-surface p-6 shadow-lg">
        <p className="text-caption font-medium uppercase tracking-wide text-ink-muted">Walk</p>
        <p className="font-mono text-5xl tabular-nums text-ink">
          {running || done ? formatCountdown(secondsLeft) : `${durationMinutes}:00`}
        </p>
        <p className="text-center text-meta text-ink-muted">
          {done
            ? "Logged — your garden felt that."
            : running
              ? "Step away when you're ready. We'll log it when the timer ends."
              : `${durationMinutes}-minute walk — one tap to start.`}
        </p>
        <div className="flex w-full gap-2">
          {!running && !done ? (
            <Button type="button" className="flex-1" onClick={() => setRunning(true)}>
              Start walk
            </Button>
          ) : running ? (
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={() => {
                const elapsedMin = Math.max(
                  1,
                  durationMinutes - Math.floor((totalSeconds - secondsLeft) / 60)
                );
                logWalk.mutate({ kind: "walk", durationMinutes: elapsedMin });
                setRunning(false);
                setDone(true);
              }}
            >
              Finish early
            </Button>
          ) : null}
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
            {done ? "Close" : "Dismiss"}
          </Button>
        </div>
      </div>
    </div>
  );
}

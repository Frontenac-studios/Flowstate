"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import Button from "@/components/kash/ui/Button";
import {
  BREATHING_PRESETS,
  totalBreathingSeconds,
  type BreathingPreset,
  type BreathingStep,
} from "@/lib/care/breathing";
import { useTRPC } from "@/trpc/client";

import "@/components/kash/care/care-breathing-motion.css";

type PhaseState = { stepIndex: number; secondsLeft: number; cycle: number };

type Props = {
  open: boolean;
  onClose: () => void;
  /** Target session length in minutes (default 2). */
  targetMinutes?: number;
};

function nextPhaseState(
  preset: BreathingPreset,
  state: PhaseState,
  targetCycles: number
): PhaseState | "complete" {
  const steps = BREATHING_PRESETS[preset].steps;
  const nextIndex = state.stepIndex + 1;
  if (nextIndex >= steps.length) {
    const nextCycle = state.cycle + 1;
    if (nextCycle >= targetCycles) return "complete";
    return { stepIndex: 0, secondsLeft: steps[0]!.seconds, cycle: nextCycle };
  }
  return { stepIndex: nextIndex, secondsLeft: steps[nextIndex]!.seconds, cycle: state.cycle };
}

function cyclesForMinutes(preset: BreathingPreset, minutes: number): number {
  const perCycle = BREATHING_PRESETS[preset].steps.reduce((sum, step) => sum + step.seconds, 0);
  return Math.max(1, Math.ceil((minutes * 60) / perCycle));
}

/** Compact breathing overlay for timeline / nudge one-tap start (SC-1, SC-3). */
export function BreathingOverlay({ open, onClose, targetMinutes = 2 }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const preset: BreathingPreset = "box4";
  const targetCycles = cyclesForMinutes(preset, targetMinutes);
  const config = BREATHING_PRESETS[preset];

  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<PhaseState | null>(null);
  const [done, setDone] = useState(false);

  const logSession = useMutation(
    trpc.care.logQuickSelfCare.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.care.getGardenState.queryKey() });
        void queryClient.invalidateQueries({ queryKey: trpc.care.getStatsSummary.queryKey() });
      },
    })
  );

  const currentStep: BreathingStep | null =
    phase !== null ? (config.steps[phase.stepIndex] ?? null) : null;

  const orbScale = useMemo(() => {
    if (!currentStep) return 1;
    if (currentStep.phase === "inhale") return 1.18;
    if (currentStep.phase === "exhale") return 0.82;
    return 1;
  }, [currentStep]);

  const reset = useCallback(() => {
    setRunning(false);
    setPhase(null);
    setDone(false);
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const finishSession = useCallback(() => {
    const cycles = phase ? phase.cycle + 1 : targetCycles;
    logSession.mutate({
      kind: "breathe",
      durationMinutes: Math.max(1, Math.round(totalBreathingSeconds(preset, cycles) / 60)),
      preset,
      cycles,
    });
    setRunning(false);
    setPhase(null);
    setDone(true);
  }, [logSession, phase, preset, targetCycles]);

  useEffect(() => {
    if (!running || !phase) return;
    const timer = window.setInterval(() => {
      setPhase((current) => {
        if (!current) return current;
        if (current.secondsLeft > 1) return { ...current, secondsLeft: current.secondsLeft - 1 };
        const next = nextPhaseState(preset, current, targetCycles);
        if (next === "complete") {
          window.setTimeout(() => finishSession(), 0);
          return current;
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [finishSession, phase, preset, running, targetCycles]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-overlay flex items-center justify-center bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-4 backdrop-blur-sm"
      role="dialog"
      aria-label="Breathing session"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-card border border-subtle bg-surface p-6 shadow-lg">
        <div className="relative flex h-40 w-full items-center justify-center rounded-card bg-surface-2">
          <div
            className={`care-breathing-orb relative flex h-28 w-28 items-center justify-center ${running ? "care-breathing-orb-active" : ""}`}
            style={{ transform: running ? `scale(${orbScale})` : undefined }}
            aria-hidden
          >
            <span className="absolute inset-0 rounded-full bg-[var(--cat-body-mind-fill)]" />
            <span className="absolute inset-[18%] rounded-full bg-[color-mix(in_srgb,var(--cat-body-mind-solid)_35%,var(--surface))]" />
            <span className="absolute inset-[32%] rounded-full bg-[color-mix(in_srgb,var(--cat-body-mind-solid)_55%,var(--surface))]" />
          </div>
          <div className="absolute inset-x-0 bottom-3 text-center">
            {running && currentStep ? (
              <>
                <p className="text-sm font-medium text-ink">{currentStep.label}</p>
                <p className="text-caption text-ink-muted">
                  {phase?.secondsLeft}s · cycle {(phase?.cycle ?? 0) + 1} of {targetCycles}
                </p>
              </>
            ) : done ? (
              <p className="text-caption text-ink-muted">Logged — nice reset.</p>
            ) : (
              <p className="text-caption text-ink-muted">
                About {targetMinutes} minutes of box breathing
              </p>
            )}
          </div>
        </div>

        <div className="flex w-full gap-2">
          {!running && !done ? (
            <Button
              type="button"
              className="flex-1"
              onClick={() => {
                setRunning(true);
                setPhase({
                  stepIndex: 0,
                  secondsLeft: config.steps[0]!.seconds,
                  cycle: 0,
                });
              }}
            >
              Start
            </Button>
          ) : running ? (
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={() => finishSession()}
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

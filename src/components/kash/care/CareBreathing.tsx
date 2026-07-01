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

import "./care-breathing-motion.css";

type PhaseState = { stepIndex: number; secondsLeft: number; cycle: number };

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

export function CareBreathing() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [preset, setPreset] = useState<BreathingPreset>("box4");
  const [targetCycles, setTargetCycles] = useState(4);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<PhaseState | null>(null);
  const [completedMessage, setCompletedMessage] = useState<string | null>(null);

  const config = BREATHING_PRESETS[preset];
  const currentStep: BreathingStep | null =
    phase !== null ? (config.steps[phase.stepIndex] ?? null) : null;

  const logSession = useMutation(
    trpc.care.logBreathingSession.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.care.getGardenState.queryKey() });
        void queryClient.invalidateQueries({ queryKey: trpc.care.getStatsSummary.queryKey() });
        setCompletedMessage("Logged — your garden felt that.");
      },
    })
  );

  const orbScale = useMemo(() => {
    if (!currentStep) return 1;
    if (currentStep.phase === "inhale") return 1.18;
    if (currentStep.phase === "exhale") return 0.82;
    return 1;
  }, [currentStep]);

  const finishSession = useCallback(() => {
    if (!phase) return;
    logSession.mutate({
      preset,
      cycles: phase.cycle + 1,
      durationSeconds: totalBreathingSeconds(preset, phase.cycle + 1),
    });
    setRunning(false);
    setPhase(null);
  }, [logSession, phase, preset]);

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

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6">
      <div className="flex w-full flex-col gap-2 rounded-card border border-subtle bg-surface p-4">
        <h2 className="text-caption font-medium text-ink-muted">Preset</h2>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(BREATHING_PRESETS) as BreathingPreset[]).map((key) => (
            <button
              key={key}
              type="button"
              disabled={running}
              onClick={() => setPreset(key)}
              className={`rounded-chip px-3 py-1.5 text-meta transition-colors ${
                preset === key
                  ? "bg-[var(--cat-body-mind-fill)] text-[var(--cat-body-mind-text)]"
                  : "border border-subtle text-ink-muted hover:bg-surface-2"
              }`}
            >
              {BREATHING_PRESETS[key].label}
            </button>
          ))}
        </div>
        <p className="text-meta leading-snug text-ink-faint">{config.description}</p>
      </div>

      <div className="relative flex h-56 w-full items-center justify-center rounded-card border border-subtle bg-surface-2">
        <div
          className={`care-breathing-orb flex h-32 w-32 items-center justify-center rounded-full bg-[var(--cat-body-mind-fill)] ${running ? "care-breathing-orb-active" : ""}`}
          style={{ transform: running ? `scale(${orbScale})` : undefined }}
          aria-hidden
        >
          <span className="text-4xl">🫧</span>
        </div>
        <div className="absolute inset-x-0 bottom-4 text-center">
          {running && currentStep ? (
            <>
              <p className="text-subtitle font-medium text-ink">{currentStep.label}</p>
              <p className="text-meta text-ink-muted">
                {phase?.secondsLeft}s · cycle {(phase?.cycle ?? 0) + 1} of {targetCycles}
              </p>
            </>
          ) : (
            <p className="text-meta text-ink-muted">Tap start when you&apos;re ready</p>
          )}
        </div>
      </div>

      <div className="flex w-full flex-col gap-3">
        {!running ? (
          <>
            <label className="flex items-center justify-between gap-3 text-meta text-ink-muted">
              <span>Cycles</span>
              <select
                value={targetCycles}
                onChange={(event) => setTargetCycles(Number(event.target.value))}
                className="rounded-control border border-subtle bg-surface px-2 py-1 text-body text-ink"
              >
                {[2, 4, 6, 8].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              onClick={() => {
                setCompletedMessage(null);
                setRunning(true);
                setPhase({
                  stepIndex: 0,
                  secondsLeft: config.steps[0]!.seconds,
                  cycle: 0,
                });
              }}
              className="w-full"
            >
              Start breathing
            </Button>
          </>
        ) : (
          <Button type="button" variant="ghost" onClick={finishSession} className="w-full">
            {logSession.isPending ? "Saving…" : "Finish early"}
          </Button>
        )}
        {completedMessage ? (
          <p className="text-center text-meta text-ink-muted">{completedMessage}</p>
        ) : null}
      </div>
    </div>
  );
}

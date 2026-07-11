"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { BREATHING_PRESETS, type BreathingPreset, type BreathingStep } from "@/lib/care/breathing";

export type BreathingPhaseState = { stepIndex: number; secondsLeft: number; cycle: number };

function nextPhaseState(
  preset: BreathingPreset,
  state: BreathingPhaseState,
  targetCycles: number
): BreathingPhaseState | "complete" {
  const steps = BREATHING_PRESETS[preset].steps;
  const nextIndex = state.stepIndex + 1;
  if (nextIndex >= steps.length) {
    const nextCycle = state.cycle + 1;
    if (nextCycle >= targetCycles) return "complete";
    return { stepIndex: 0, secondsLeft: steps[0]!.seconds, cycle: nextCycle };
  }
  return { stepIndex: nextIndex, secondsLeft: steps[nextIndex]!.seconds, cycle: state.cycle };
}

type Options = {
  preset: BreathingPreset;
  targetCycles: number;
  /** Called when all target cycles finish naturally. */
  onComplete?: (cycles: number) => void;
};

export function useBreathingSession({ preset, targetCycles, onComplete }: Options) {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<BreathingPhaseState | null>(null);
  const [pendingComplete, setPendingComplete] = useState(false);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const presetRef = useRef(preset);
  presetRef.current = preset;

  const targetCyclesRef = useRef(targetCycles);
  targetCyclesRef.current = targetCycles;

  const steps = BREATHING_PRESETS[preset].steps;
  const currentStep: BreathingStep | null =
    phase !== null ? (steps[phase.stepIndex] ?? null) : null;

  const completedCycles = phase ? phase.cycle + 1 : 0;

  const start = useCallback(() => {
    const firstStep = BREATHING_PRESETS[preset].steps[0]!;
    setRunning(true);
    setPendingComplete(false);
    setPhase({ stepIndex: 0, secondsLeft: firstStep.seconds, cycle: 0 });
  }, [preset]);

  const stop = useCallback(() => {
    setRunning(false);
    setPendingComplete(false);
    setPhase(null);
  }, []);

  useEffect(() => {
    if (!pendingComplete) return;
    onCompleteRef.current?.(targetCyclesRef.current);
    setRunning(false);
    setPhase(null);
    setPendingComplete(false);
  }, [pendingComplete]);

  useEffect(() => {
    if (!running) return;

    const timer = window.setInterval(() => {
      setPhase((current) => {
        if (!current) return current;
        if (current.secondsLeft > 1) {
          return { ...current, secondsLeft: current.secondsLeft - 1 };
        }

        const next = nextPhaseState(presetRef.current, current, targetCyclesRef.current);
        if (next === "complete") {
          setPendingComplete(true);
          return current;
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [running]);

  return {
    running,
    phase,
    currentStep,
    completedCycles,
    start,
    stop,
  };
}

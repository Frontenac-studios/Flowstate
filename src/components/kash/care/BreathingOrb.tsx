"use client";

import { useEffect, useState } from "react";

import { prefersReducedMotion } from "@/lib/animate/motion-tokens";
import { cn } from "@/lib/cn";
import type { BreathingPhase, BreathingStep } from "@/lib/care/breathing";

import "./care-breathing-motion.css";

const INHALE_SCALE = 1.18;
const EXHALE_SCALE = 0.82;

function isHoldPhase(phase: BreathingPhase): boolean {
  return phase === "hold-in" || phase === "hold-out";
}

function orbScale(phase: BreathingPhase, atEnd: boolean): number {
  if (isHoldPhase(phase)) {
    return phase === "hold-in" ? INHALE_SCALE : EXHALE_SCALE;
  }
  if (phase === "inhale") return atEnd ? INHALE_SCALE : EXHALE_SCALE;
  return atEnd ? EXHALE_SCALE : INHALE_SCALE;
}

type Props = {
  step: BreathingStep | null;
  stepIndex: number;
  cycle: number;
  active: boolean;
  size?: "md" | "lg";
  className?: string;
};

export function BreathingOrb({ step, stepIndex, cycle, active, size = "lg", className }: Props) {
  const reducedMotion = prefersReducedMotion();
  const phaseKey = step ? `${cycle}-${stepIndex}` : null;
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (!active || !step) {
      setAnimating(false);
      return;
    }

    setAnimating(false);
    const id = requestAnimationFrame(() => setAnimating(true));
    return () => cancelAnimationFrame(id);
  }, [active, phaseKey, step]);

  const dimension = size === "lg" ? "h-48 w-48" : "h-32 w-32";

  let scale = 1;
  let transition = "none";

  if (active && step) {
    const hold = isHoldPhase(step.phase);
    const atEnd = animating || hold || reducedMotion;
    scale = orbScale(step.phase, atEnd);
    if (animating && !hold && !reducedMotion) {
      transition = `transform ${step.seconds}s var(--ease-enter)`;
    }
  }

  return (
    <div
      className={cn(
        "care-breathing-orb relative flex items-center justify-center",
        dimension,
        className
      )}
      style={{ transform: `scale(${scale})`, transition }}
      aria-hidden
    >
      <span className="absolute inset-0 rounded-full bg-[var(--cat-body-mind-fill)]" />
      <span className="absolute inset-[18%] rounded-full bg-[color-mix(in_srgb,var(--cat-body-mind-solid)_35%,var(--surface))]" />
      <span className="absolute inset-[32%] rounded-full bg-[color-mix(in_srgb,var(--cat-body-mind-solid)_55%,var(--surface))]" />
      <span className="absolute inset-[44%] rounded-full bg-[var(--cat-body-mind-solid)] opacity-80" />
    </div>
  );
}

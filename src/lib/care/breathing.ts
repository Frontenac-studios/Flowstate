export type BreathingPreset = "box4" | "relax4-6";
export type BreathingPhase = "inhale" | "hold-in" | "exhale" | "hold-out";

export type BreathingStep = { phase: BreathingPhase; seconds: number; label: string };

export const BREATHING_PRESETS: Record<
  BreathingPreset,
  { label: string; description: string; steps: BreathingStep[] }
> = {
  box4: {
    label: "Box · 4",
    description: "Four counts in, hold, out, hold — steady and grounding.",
    steps: [
      { phase: "inhale", seconds: 4, label: "Breathe in" },
      { phase: "hold-in", seconds: 4, label: "Hold" },
      { phase: "exhale", seconds: 4, label: "Breathe out" },
      { phase: "hold-out", seconds: 4, label: "Hold" },
    ],
  },
  "relax4-6": {
    label: "Calm · 4-6",
    description: "A longer exhale to settle — four in, six out.",
    steps: [
      { phase: "inhale", seconds: 4, label: "Breathe in" },
      { phase: "exhale", seconds: 6, label: "Breathe out" },
    ],
  },
};

export function totalBreathingSeconds(preset: BreathingPreset, cycles: number): number {
  const stepTotal = BREATHING_PRESETS[preset].steps.reduce((sum, step) => sum + step.seconds, 0);
  return stepTotal * cycles;
}

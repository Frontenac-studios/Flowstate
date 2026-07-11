"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { totalBreathingSeconds, type BreathingPreset } from "@/lib/care/breathing";
import { useTRPC } from "@/trpc/client";

import { BreathingFullscreen } from "./BreathingFullscreen";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Target session length in minutes (default 2). */
  targetMinutes?: number;
};

function cyclesForMinutes(preset: BreathingPreset, minutes: number): number {
  const secondsPerCycle = totalBreathingSeconds(preset, 1);
  return Math.max(1, Math.ceil((minutes * 60) / secondsPerCycle));
}

/** Fullscreen breathing for timeline / nudge one-tap start (SC-1, SC-3). */
export function BreathingOverlay({ open, onClose, targetMinutes = 2 }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const preset: BreathingPreset = "box4";
  const targetCycles = cyclesForMinutes(preset, targetMinutes);

  const logSession = useMutation(
    trpc.care.logQuickSelfCare.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.care.getGardenState.queryKey() });
        void queryClient.invalidateQueries({ queryKey: trpc.care.getStatsSummary.queryKey() });
        onClose();
      },
    })
  );

  const handleFinishAndLog = useCallback(
    (cycles: number) => {
      logSession.mutate({
        kind: "breathe",
        durationMinutes: Math.max(1, Math.round(totalBreathingSeconds(preset, cycles) / 60)),
        preset,
        cycles,
      });
    },
    [logSession, preset]
  );

  return (
    <BreathingFullscreen
      open={open}
      preset={preset}
      targetCycles={targetCycles}
      autoStart
      onClose={onClose}
      onFinishAndLog={handleFinishAndLog}
      isLogging={logSession.isPending}
    />
  );
}

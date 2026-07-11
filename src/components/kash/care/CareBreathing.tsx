"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import Button from "@/components/kash/ui/Button";
import {
  BREATHING_PRESETS,
  totalBreathingSeconds,
  type BreathingPreset,
} from "@/lib/care/breathing";
import { cn } from "@/lib/cn";
import { useTRPC } from "@/trpc/client";

import { BreathingFullscreen } from "./BreathingFullscreen";
import { BreathingOrb } from "./BreathingOrb";

export function CareBreathing() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [preset, setPreset] = useState<BreathingPreset>("box4");
  const [targetCycles, setTargetCycles] = useState(4);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [completedMessage, setCompletedMessage] = useState<string | null>(null);

  const config = BREATHING_PRESETS[preset];

  const logSession = useMutation(
    trpc.care.logBreathingSession.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.care.getGardenState.queryKey() });
        void queryClient.invalidateQueries({ queryKey: trpc.care.getStatsSummary.queryKey() });
        setCompletedMessage("Logged — your garden felt that.");
        setSessionOpen(false);
      },
    })
  );

  const handleFinishAndLog = useCallback(
    (cycles: number) => {
      logSession.mutate({
        preset,
        cycles,
        durationSeconds: totalBreathingSeconds(preset, cycles),
      });
    },
    [logSession, preset]
  );

  return (
    <>
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6">
        <div className="flex w-full flex-col gap-2 rounded-card border border-subtle bg-surface p-4 shadow-surface">
          <h2 className="text-caption font-medium text-ink-muted">Preset</h2>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(BREATHING_PRESETS) as BreathingPreset[]).map((key) => (
              <button
                key={key}
                type="button"
                disabled={sessionOpen}
                onClick={() => setPreset(key)}
                className={cn(
                  "rounded-chip px-3 py-1.5 text-meta transition-colors",
                  preset === key
                    ? "bg-[var(--cat-body-mind-fill)] text-[var(--cat-body-mind-text)]"
                    : "border border-subtle text-ink-muted hover:bg-surface-2"
                )}
              >
                {BREATHING_PRESETS[key].label}
              </button>
            ))}
          </div>
          <p className="text-meta leading-snug text-ink-faint">{config.description}</p>
        </div>

        <div className="relative flex h-56 w-full items-center justify-center rounded-card border border-subtle bg-surface-2 shadow-surface">
          <BreathingOrb step={null} stepIndex={0} cycle={0} active={false} size="md" />
          <div className="absolute inset-x-0 bottom-4 text-center">
            <p className="text-meta text-ink-muted">Tap start when you&apos;re ready</p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3">
          <label className="flex items-center justify-between gap-3 text-meta text-ink-muted">
            <span>Cycles</span>
            <select
              value={targetCycles}
              disabled={sessionOpen}
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
            disabled={sessionOpen}
            onClick={() => {
              setCompletedMessage(null);
              setSessionOpen(true);
            }}
            className="w-full"
          >
            Start breathing
          </Button>
          {completedMessage ? (
            <p className="text-center text-meta text-ink-muted">{completedMessage}</p>
          ) : null}
        </div>
      </div>

      <BreathingFullscreen
        open={sessionOpen}
        preset={preset}
        targetCycles={targetCycles}
        autoStart
        onClose={() => setSessionOpen(false)}
        onFinishAndLog={handleFinishAndLog}
        isLogging={logSession.isPending}
      />
    </>
  );
}

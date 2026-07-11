"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import Button from "@/components/kash/ui/Button";
import IconButton from "@/components/kash/ui/IconButton";
import { kashIconProps } from "@/components/kash/ui/icon";
import { useBreathingSession } from "@/hooks/useBreathingSession";
import type { BreathingPreset } from "@/lib/care/breathing";

import { BreathingOrb } from "./BreathingOrb";

type Props = {
  open: boolean;
  preset: BreathingPreset;
  targetCycles: number;
  /** Start the session as soon as the fullscreen opens. */
  autoStart?: boolean;
  onClose: () => void;
  onFinishAndLog: (cycles: number) => void;
  isLogging?: boolean;
};

export function BreathingFullscreen({
  open,
  preset,
  targetCycles,
  autoStart = false,
  onClose,
  onFinishAndLog,
  isLogging = false,
}: Props) {
  const [confirmExit, setConfirmExit] = useState(false);

  const { running, phase, currentStep, completedCycles, start, stop } = useBreathingSession({
    preset,
    targetCycles,
    onComplete: onFinishAndLog,
  });

  useEffect(() => {
    if (!open) {
      stop();
      setConfirmExit(false);
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setConfirmExit(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, stop]);

  const autoStartedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      autoStartedRef.current = false;
      return;
    }
    if (!autoStart || autoStartedRef.current) return;
    autoStartedRef.current = true;
    start();
  }, [autoStart, open, start]);

  const handleFinishAndLog = useCallback(() => {
    const cycles = phase ? completedCycles : 0;
    if (cycles > 0) {
      onFinishAndLog(cycles);
    } else {
      onClose();
    }
    stop();
    setConfirmExit(false);
  }, [completedCycles, onClose, onFinishAndLog, phase, stop]);

  const handleAbandon = useCallback(() => {
    stop();
    setConfirmExit(false);
    onClose();
  }, [onClose, stop]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-modal flex flex-col bg-surface"
      role="dialog"
      aria-label="Breathing session"
      aria-modal="true"
    >
      <div className="flex items-center justify-end p-4">
        {confirmExit ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleFinishAndLog}
              disabled={isLogging || !phase}
            >
              {isLogging ? "Saving…" : "Finish & log"}
            </Button>
            <Button type="button" variant="ghost" onClick={handleAbandon}>
              Exit without saving
            </Button>
            <Button type="button" variant="ghost" onClick={() => setConfirmExit(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <IconButton
            type="button"
            aria-label="Exit breathing session"
            onClick={() => setConfirmExit(true)}
          >
            <X {...kashIconProps({ tokenSize: "sm" })} aria-hidden />
          </IconButton>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 pb-16">
        <BreathingOrb
          step={currentStep}
          stepIndex={phase?.stepIndex ?? 0}
          cycle={phase?.cycle ?? 0}
          active={running}
          size="lg"
        />
        {running && currentStep ? (
          <p className="text-h2 font-medium text-ink">{currentStep.label}</p>
        ) : !autoStart ? (
          <Button type="button" onClick={start}>
            Start
          </Button>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { prefersReducedMotion } from "@/lib/animate/motion-tokens";

import { EditableDuration } from "./EditableDuration";

type Props = {
  remainingSeconds: number;
  totalSeconds: number;
  onDurationCommit: (seconds: number) => void;
  label: string;
  elapsedWorkSeconds?: number;
  showElapsed?: boolean;
  durationEditable?: boolean;
  className?: string;
};

const RING_SIZE = 220;
const STROKE = 4;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function FocusTimerRing({
  remainingSeconds,
  totalSeconds,
  onDurationCommit,
  label,
  elapsedWorkSeconds = 0,
  showElapsed = false,
  durationEditable = true,
  className = "",
}: Props) {
  const safeTotal = Math.max(1, totalSeconds);
  const progress = Math.min(1, Math.max(0, remainingSeconds / safeTotal));
  const offset = CIRCUMFERENCE * (1 - progress);
  const reducedMotion = prefersReducedMotion();

  return (
    <div className={`focus-ring-arrive flex flex-col items-center gap-5 ${className}`}>
      <span className="text-caption tracking-[0.12em] text-ink-faint">{label}</span>
      <div className="relative flex items-center justify-center">
        <svg
          width={RING_SIZE}
          height={RING_SIZE}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          className={reducedMotion ? "" : "focus-ring-breathe"}
          aria-hidden
        >
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--border-subtle)"
            strokeWidth={STROKE}
          />
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--ink)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear motion-reduce:transition-none"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <EditableDuration
            seconds={remainingSeconds}
            onCommit={onDurationCommit}
            disabled={!durationEditable}
          />
        </div>
      </div>
      {showElapsed ? (
        <span className="text-caption text-ink-muted">
          elapsed {formatElapsed(elapsedWorkSeconds)}
        </span>
      ) : null}
    </div>
  );
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

"use client";

import { useMemo, useState } from "react";

import Button from "@/components/kash/ui/Button";
import {
  buildGoalAttentionHeatmap,
  buildGoalJourney,
  heatmapCellClass,
  type GoalMilestoneStop,
} from "@/lib/planning/goal-journey";

type Props = {
  milestones: GoalMilestoneStop[];
  attentionDays?: Array<{ date: string; completions: number; focusMinutes: number }>;
  onWorkTowardToday?: () => void;
  workTowardPending?: boolean;
};

export function GoalJourneyTimeline({
  milestones,
  attentionDays = [],
  onWorkTowardToday,
  workTowardPending = false,
}: Props) {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const journey = useMemo(() => buildGoalJourney(milestones), [milestones]);
  const heatmap = useMemo(() => buildGoalAttentionHeatmap(attentionDays), [attentionDays]);
  const maxScore = Math.max(...heatmap.map((d) => d.score), 1);
  const currentStop = journey.stops.find((stop) => stop.id === journey.currentStopId);

  if (journey.totalStops === 0) {
    return (
      <p className="text-caption text-ink-muted">Add the first stop on this goal&apos;s journey.</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-caption text-ink-muted">
        {journey.completedStops} of {journey.totalStops} stops
      </p>
      <ol className="flex flex-col gap-2">
        {journey.stops.map((stop) => {
          const state = stop.isComplete
            ? "done"
            : stop.id === journey.currentStopId
              ? "current"
              : "upcoming";
          const marker = state === "done" ? "✓" : state === "current" ? "◉" : "○";
          return (
            <li
              key={stop.id}
              className={`flex items-start gap-2 text-caption ${
                state === "upcoming" ? "text-ink-faint" : "text-ink"
              }`}
            >
              <span aria-hidden className="mt-0.5 w-4 shrink-0 text-center">
                {marker}
              </span>
              <div className="min-w-0 flex-1">
                <p className={state === "done" ? "line-through opacity-70" : ""}>{stop.title}</p>
                <p className="text-ink-faint">
                  {stop.taskCounts.completed}/{stop.taskCounts.total} tasks
                  {stop.targetDate ? ` · ${stop.targetDate}` : ""}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      {currentStop && onWorkTowardToday ? (
        <Button
          type="button"
          variant="ghost"
          className="self-start text-caption"
          disabled={workTowardPending}
          onClick={onWorkTowardToday}
        >
          {workTowardPending ? "Adding…" : "Work toward this today"}
        </Button>
      ) : null}
      <button
        type="button"
        className="self-start text-caption text-ink-muted hover:text-ink"
        onClick={() => setShowHeatmap((v) => !v)}
      >
        {showHeatmap ? "Hide" : "Show"} attention heatmap
      </button>
      {showHeatmap && heatmap.length > 0 ? (
        <div
          className="grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1"
          aria-label="Goal attention heatmap"
        >
          {heatmap.slice(-28).map((cell) => (
            <span
              key={cell.date}
              title={cell.date}
              className={`aspect-square rounded-sm ${heatmapCellClass(cell.score, maxScore)}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

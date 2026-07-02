import type { ProjectCategory } from "@/lib/projects/categories";

export type GoalMilestoneStop = {
  id: string;
  title: string;
  sortOrder: number;
  targetDate: string | null;
  completedAt: Date | null;
  isComplete: boolean;
  taskCounts: { completed: number; total: number };
};

export type GoalJourney = {
  stops: GoalMilestoneStop[];
  completedStops: number;
  totalStops: number;
  currentStopId: string | null;
};

export function buildGoalJourney(
  milestones: Array<{
    id: string;
    title: string;
    sortOrder: number;
    targetDate?: string | null;
    completedAt?: Date | null;
    isComplete: boolean;
    taskCounts: { completed: number; total: number };
  }>
): GoalJourney {
  const stops: GoalMilestoneStop[] = [...milestones]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((m) => ({
      ...m,
      targetDate: m.targetDate ?? null,
      completedAt: m.completedAt ?? null,
    }));
  const completedStops = stops.filter((s) => s.isComplete).length;
  const currentStopId = stops.find((s) => !s.isComplete)?.id ?? null;
  return {
    stops,
    completedStops,
    totalStops: stops.length,
    currentStopId,
  };
}

export type GoalAttentionDay = {
  date: string;
  score: number;
};

/** Aggregate per-day attention from task completions + focus time counts. */
export function buildGoalAttentionHeatmap(
  days: Array<{ date: string; completions: number; focusMinutes: number }>
): GoalAttentionDay[] {
  return days.map((day) => ({
    date: day.date,
    score: day.completions * 2 + Math.min(day.focusMinutes, 240) / 30,
  }));
}

export function heatmapCellClass(score: number, maxScore: number): string {
  if (score <= 0 || maxScore <= 0) return "bg-surface-2";
  const ratio = score / maxScore;
  if (ratio >= 0.75) return "bg-ink";
  if (ratio >= 0.5) return "bg-ink-muted";
  if (ratio >= 0.25) return "bg-ink-faint";
  return "bg-surface-2";
}

export function isLargeGoalForEvidence(input: {
  targetHorizon: string | null;
  milestoneCount: number;
}): boolean {
  const largeHorizon = input.targetHorizon === "quarter" || input.targetHorizon === "year";
  return largeHorizon || input.milestoneCount >= 3;
}

export type GoalSteeringOffer = {
  goalId: string;
  goalTitle: string;
  milestoneId: string;
  milestoneTitle: string;
  stepTitle: string;
  category: ProjectCategory;
};

import type { WinCandidate } from "./types";
import { WIN_PROPOSAL_TIERS } from "./types";

export type TaskCompletionCandidate = {
  id: string;
  title: string;
  isTop3: boolean;
  top3Order: number | null;
  priority: number;
  timeEstimateMinutes: number | null;
  completedAt: Date;
  milestoneId: string | null;
  milestoneTitle: string | null;
};

export type CareEventCandidate = {
  id: string;
  label: string;
  occurredAt: Date;
};

export type AbyssActionCandidate = {
  id: string;
  title: string;
  occurredAt: Date;
};

export function buildWinCandidates(input: {
  tasks: TaskCompletionCandidate[];
  careEvents: CareEventCandidate[];
  abyssActions: AbyssActionCandidate[];
}): WinCandidate[] {
  const candidates: WinCandidate[] = [];

  for (const task of input.tasks) {
    if (task.isTop3) {
      candidates.push({
        source: "task",
        refId: task.id,
        label: task.title,
        tier: WIN_PROPOSAL_TIERS.top3Done,
        occurredAt: task.completedAt,
        top3Order: task.top3Order,
      });
      continue;
    }

    if (task.milestoneId) {
      const label = task.milestoneTitle ? `Milestone: ${task.milestoneTitle}` : task.title;
      candidates.push({
        source: "goal",
        refId: task.milestoneId,
        label,
        tier: WIN_PROPOSAL_TIERS.goalMilestone,
        occurredAt: task.completedAt,
      });
      continue;
    }

    candidates.push({
      source: "task",
      refId: task.id,
      label: task.title,
      tier: WIN_PROPOSAL_TIERS.priorityEffortDone,
      occurredAt: task.completedAt,
      priority: task.priority,
      effortMinutes: task.timeEstimateMinutes,
    });
  }

  for (const event of input.careEvents) {
    candidates.push({
      source: "care_event",
      refId: event.id,
      label: event.label,
      tier: WIN_PROPOSAL_TIERS.careEvent,
      occurredAt: event.occurredAt,
    });
  }

  for (const item of input.abyssActions) {
    candidates.push({
      source: "abyss",
      refId: item.id,
      label: item.title,
      tier: WIN_PROPOSAL_TIERS.abyssAction,
      occurredAt: item.occurredAt,
    });
  }

  return candidates;
}

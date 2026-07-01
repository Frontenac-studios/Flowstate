import type { CheckInDepth } from "@/lib/planning/check-in";

import type { AboutMeEditProposal } from "./propose";

type CheckInGoalRow = {
  title: string;
  state: string;
  targetYear: number | null;
};

export function mockCheckInAboutMeProposals(
  depth: CheckInDepth,
  scopeKey: string,
  goals: readonly CheckInGoalRow[],
  year: number
): AboutMeEditProposal[] {
  const activeGoals = goals.filter((g) => g.state === "active" && g.targetYear === year);
  if (activeGoals.length === 0) return [];

  const titles = activeGoals.slice(0, 3).map((g) => g.title);
  const depthPhrase =
    depth === "week"
      ? "this week"
      : depth === "month"
        ? "this month"
        : depth === "quarter"
          ? "this quarter"
          : "this year";

  return [
    {
      targetSection: "work",
      payload: { text: `Priorities for ${depthPhrase}: ${titles.join("; ")}.` },
      sourceText: `planning check-in · ${scopeKey}`,
    },
  ];
}

const REFLECTION_MIN_CHARS = 24;

export function mockEodReflectionAboutMeProposals(
  localDate: string,
  reflectionText: string | null | undefined
): AboutMeEditProposal[] {
  const trimmed = reflectionText?.trim();
  if (!trimmed || trimmed.length < REFLECTION_MIN_CHARS) return [];

  const excerpt = trimmed.length > 280 ? `${trimmed.slice(0, 277).trimEnd()}…` : trimmed;

  return [
    {
      targetSection: "life",
      payload: { text: excerpt },
      sourceText: `end-of-day reflection · ${localDate}`,
    },
  ];
}

import "server-only";

import {
  mockCheckInAboutMeProposals,
  mockEodReflectionAboutMeProposals,
} from "@/lib/about-me/mock-producer";
import type { CheckInDepth } from "@/lib/planning/check-in";

import { proposeAboutMeEdit } from "./propose-about-me-edit";

type CheckInGoalRow = {
  title: string;
  state: string;
  targetYear: number | null;
};

export async function runCheckInAboutMeProducer(
  userId: string,
  depth: CheckInDepth,
  scopeKey: string,
  year: number,
  goals: readonly CheckInGoalRow[]
) {
  const proposals = mockCheckInAboutMeProposals(depth, scopeKey, goals, year);
  if (proposals.length === 0) return { created: [], skipped: 0 };
  return proposeAboutMeEdit(userId, proposals);
}

export async function runEodReflectionAboutMeProducer(
  userId: string,
  localDate: string,
  reflectionText: string | null | undefined
) {
  const proposals = mockEodReflectionAboutMeProposals(localDate, reflectionText);
  if (proposals.length === 0) return { created: [], skipped: 0 };
  return proposeAboutMeEdit(userId, proposals);
}

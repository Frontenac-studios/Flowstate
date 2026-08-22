import "server-only";

import type { CaptureContext } from "@/lib/chat/capture-context";
import type { PlanningChatSurface } from "@/lib/chat/planning-surface";

import { fetchGoalsContextSnapshot } from "./fetch-goals-context";
import { fetchPlanContextSnapshot, type PlanContextSnapshot } from "./fetch-plan-context";

export type AssembledChatContext = PlanContextSnapshot & {
  contextBlock: string;
};

export async function assembleChatContext(
  userId: string,
  threadId: string,
  captureContext?: CaptureContext | null,
  surface?: PlanningChatSurface | null
): Promise<AssembledChatContext> {
  // The goals coach reads a goal-shaped context (card, balance, past goals, inspiration)
  // and deliberately omits the task inbox. Everything else uses the planner state.
  const isGoals = surface === "goals";
  const snapshot = await (isGoals
    ? fetchGoalsContextSnapshot(userId, threadId)
    : fetchPlanContextSnapshot(userId, threadId, captureContext));

  const heading = isGoals ? "Goals coaching context:" : "Live planner state:";
  const contextBlock = [heading, snapshot.contextBlock].join("\n");

  return {
    ...snapshot,
    contextBlock,
  };
}

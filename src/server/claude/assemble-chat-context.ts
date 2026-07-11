import "server-only";

import type { CaptureContext } from "@/lib/chat/capture-context";
import type { PlanningChatSurface } from "@/lib/chat/planning-surface";

import { fetchAboutMeContextBlock } from "./fetch-about-me-context";
import { fetchGoalsContextSnapshot } from "./fetch-goals-context";
import { fetchPlanContextSnapshot, type PlanContextSnapshot } from "./fetch-plan-context";

export type AssembledChatContext = PlanContextSnapshot & {
  aboutMeBlock: string;
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
  const [aboutMeBlock, snapshot] = await Promise.all([
    fetchAboutMeContextBlock(userId),
    isGoals
      ? fetchGoalsContextSnapshot(userId, threadId)
      : fetchPlanContextSnapshot(userId, threadId, captureContext),
  ]);

  const heading = isGoals ? "Goals coaching context:" : "Live planner state:";
  const contextBlock = [aboutMeBlock, "", heading, snapshot.contextBlock].join("\n");

  return {
    ...snapshot,
    aboutMeBlock,
    contextBlock,
  };
}

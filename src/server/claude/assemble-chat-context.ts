import "server-only";

import type { CaptureContext } from "@/lib/chat/capture-context";
import type { PlanningChatSurface } from "@/lib/chat/planning-surface";

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
  void surface;
  const snapshot = await fetchPlanContextSnapshot(userId, threadId, captureContext);

  const contextBlock = ["Live planner state:", snapshot.contextBlock].join("\n");

  return {
    ...snapshot,
    contextBlock,
  };
}

import "server-only";

import type { CaptureContext } from "@/lib/chat/capture-context";

import { fetchAboutMeContextBlock } from "./fetch-about-me-context";
import { fetchPlanContextSnapshot, type PlanContextSnapshot } from "./fetch-plan-context";

export type AssembledChatContext = PlanContextSnapshot & {
  aboutMeBlock: string;
  contextBlock: string;
};

export async function assembleChatContext(
  userId: string,
  threadId: string,
  captureContext?: CaptureContext | null
): Promise<AssembledChatContext> {
  const [aboutMeBlock, planSnapshot] = await Promise.all([
    fetchAboutMeContextBlock(userId),
    fetchPlanContextSnapshot(userId, threadId, captureContext),
  ]);

  const contextBlock = [aboutMeBlock, "", "Live planner state:", planSnapshot.contextBlock].join(
    "\n"
  );

  return {
    ...planSnapshot,
    aboutMeBlock,
    contextBlock,
  };
}

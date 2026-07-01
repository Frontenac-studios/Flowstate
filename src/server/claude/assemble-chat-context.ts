import "server-only";

import { fetchAboutMeContextBlock } from "./fetch-about-me-context";
import { fetchPlanContextSnapshot, type PlanContextSnapshot } from "./fetch-plan-context";

export type AssembledChatContext = PlanContextSnapshot & {
  aboutMeBlock: string;
  contextBlock: string;
};

export async function assembleChatContext(
  userId: string,
  threadId: string
): Promise<AssembledChatContext> {
  const [aboutMeBlock, planSnapshot] = await Promise.all([
    fetchAboutMeContextBlock(userId),
    fetchPlanContextSnapshot(userId, threadId),
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

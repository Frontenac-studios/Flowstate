import "server-only";

import type Anthropic from "@anthropic-ai/sdk";

import { getAnthropicConfig } from "@/lib/env";

import { requireAnthropicClient } from "./client";
import { fetchPlanContextSnapshot } from "./fetch-plan-context";
import { buildSystemPrompt } from "./system-prompts";

export type NarrationInput = {
  taskId: string;
  title: string;
  isTop3: boolean;
  priority: number;
  projectSlug: string | null;
  pickReason: string;
};

export async function generateNarration(
  userId: string,
  threadId: string,
  task: NarrationInput
): Promise<string> {
  const anthropic = requireAnthropicClient();
  const config = getAnthropicConfig();
  const { contextBlock } = await fetchPlanContextSnapshot(userId, threadId);

  const userPayload = [
    "Generate a one-line RDM narration for this pick.",
    `Task: ${task.title}`,
    `Top 3: ${task.isTop3 ? "yes" : "no"}`,
    `Priority: ${task.priority}`,
    task.projectSlug ? `Project: #${task.projectSlug}` : null,
    `Pick reason: ${task.pickReason}`,
    "",
    "Planner context:",
    contextBlock,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await anthropic.messages.create({
    model: config.model,
    max_tokens: 80,
    temperature: 0.6,
    system: buildSystemPrompt("narration"),
    messages: [{ role: "user", content: userPayload }],
  });

  const block = response.content.find((b) => b.type === "text");
  const text = block?.type === "text" ? block.text.trim() : "";
  if (!text) {
    return fallbackNarration(task);
  }
  return text;
}

export function fallbackNarration(task: Pick<NarrationInput, "title" | "isTop3">): string {
  return task.isTop3
    ? `Going with **${task.title}** — it's Top 3.`
    : `Going with **${task.title}** — next on your list.`;
}

export function buildAnthropicMessages(
  history: { role: "user" | "assistant"; text: string }[],
  contextBlock: string,
  latestUserText: string
): Anthropic.MessageParam[] {
  const contextPrefix = `Current planner state:\n${contextBlock}\n\n---\n\n`;
  const prior = history.slice(-18).map((m) => ({
    role: m.role,
    content: m.text,
  })) as Anthropic.MessageParam[];

  return [...prior, { role: "user", content: contextPrefix + latestUserText }];
}

export async function streamCompanionReply(params: {
  userId: string;
  threadId: string;
  userText: string;
}): Promise<{
  stream: AsyncIterable<Anthropic.MessageStreamEvent>;
  getFullText: () => Promise<string>;
}> {
  const anthropic = requireAnthropicClient();
  const config = getAnthropicConfig();
  const { contextBlock, history } = await fetchPlanContextSnapshot(params.userId, params.threadId);
  const messages = buildAnthropicMessages(history, contextBlock, params.userText);

  const stream = anthropic.messages.stream({
    model: config.model,
    max_tokens: 1024,
    system: buildSystemPrompt("companion"),
    messages,
  });

  return {
    stream,
    getFullText: async () => {
      const final = await stream.finalMessage();
      const block = final.content.find((b) => b.type === "text");
      return block?.type === "text" ? block.text : "";
    },
  };
}

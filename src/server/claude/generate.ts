import "server-only";

import type Anthropic from "@anthropic-ai/sdk";

import { getAnthropicConfig } from "@/lib/env";
import type { ProposedAction } from "@/lib/chat/proposed-actions";

import { assembleChatContext } from "./assemble-chat-context";
import { requireAnthropicClient } from "./client";
import { formatCaptureContextBlock, type CaptureContext } from "@/lib/chat/capture-context";
import type { PlanningChatSurface } from "@/lib/chat/planning-surface";
import { executeChatTool, toolsForSurface } from "./chat-tools";
import { buildChatSystemPrompt, buildSystemPrompt, registerForThread } from "./system-prompts";

const MAX_TOOL_ROUNDS = 5;

export type CompanionStreamDelta =
  | { type: "delta"; text: string }
  | { type: "proposal"; proposal: ProposedAction };

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
  const { aboutMeBlock, contextBlock } = await assembleChatContext(userId, threadId);

  const userPayload = [
    "Generate a one-line RDM narration for this pick.",
    `Task: ${task.title}`,
    `Top 3: ${task.isTop3 ? "yes" : "no"}`,
    `Priority: ${task.priority}`,
    task.projectSlug ? `Project: #${task.projectSlug}` : null,
    `Pick reason: ${task.pickReason}`,
    "",
    "About me:",
    aboutMeBlock,
    "",
    "Context:",
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
  if (!text) return fallbackNarration(task);
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
  const contextPrefix = `Current context:\n${contextBlock}\n\n---\n\n`;
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
  planningSurface?: PlanningChatSurface | null;
  captureContext?: CaptureContext | null;
  signal?: AbortSignal;
}): Promise<{
  stream: AsyncIterable<CompanionStreamDelta>;
  getFullText: () => string;
  getMutatedTasks: () => boolean;
  getPendingProposal: () => ProposedAction | null;
}> {
  const anthropic = requireAnthropicClient();
  const config = getAnthropicConfig();
  const register = registerForThread(params.threadId);
  const tools = toolsForSurface(register, params.planningSurface);
  const { contextBlock, history } = await assembleChatContext(params.userId, params.threadId);
  const captureBlock = params.captureContext
    ? formatCaptureContextBlock(params.captureContext)
    : null;
  const enrichedContext = captureBlock ? `${contextBlock}\n\n${captureBlock}` : contextBlock;
  let messages = buildAnthropicMessages(history, enrichedContext, params.userText);

  const state = {
    fullText: "",
    mutatedTasks: false,
    pendingProposal: null as ProposedAction | null,
  };

  async function* run(): AsyncGenerator<CompanionStreamDelta> {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      if (params.signal?.aborted) break;

      const stream = anthropic.messages.stream({
        model: config.model,
        max_tokens: 2048,
        system: buildChatSystemPrompt(
          params.threadId,
          params.planningSurface,
          params.captureContext
        ),
        messages,
        tools,
      });

      for await (const event of stream) {
        if (params.signal?.aborted) break;
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          state.fullText += event.delta.text;
          yield { type: "delta", text: event.delta.text };
        }
      }

      if (params.signal?.aborted) break;

      const final = await stream.finalMessage();
      const toolUses = final.content.filter((block) => block.type === "tool_use");
      if (toolUses.length === 0 || final.stop_reason !== "tool_use") break;

      messages = [...messages, { role: "assistant", content: final.content }];

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUses) {
        if (params.signal?.aborted) break;
        if (toolUse.type !== "tool_use") continue;
        const result = await executeChatTool(params.userId, toolUse.name, toolUse.input, {
          register,
          threadId: params.threadId,
        });
        if (result.mutatedTasks) state.mutatedTasks = true;
        if (result.proposal) {
          state.pendingProposal = result.proposal;
          yield { type: "proposal", proposal: result.proposal };
        }
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: result.content,
        });
      }

      messages = [...messages, { role: "user", content: toolResults }];
    }
  }

  return {
    stream: run(),
    getFullText: () => state.fullText,
    getMutatedTasks: () => state.mutatedTasks,
    getPendingProposal: () => state.pendingProposal,
  };
}

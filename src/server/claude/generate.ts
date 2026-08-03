import "server-only";

import {
  generateText,
  jsonSchema,
  stepCountIs,
  streamText,
  tool,
  type ModelMessage,
  type ToolSet,
} from "ai";

import { mergeProposals } from "@/lib/chat/merge-proposals";
import type { ProposedAction } from "@/lib/chat/proposed-actions";
import type { ChatToolDef } from "@/lib/chat/chat-tool-catalog";

import { assembleChatContext } from "./assemble-chat-context";
import { requireModel } from "./client";
import { formatCaptureContextBlock, type CaptureContext } from "@/lib/chat/capture-context";
import type { PlanningChatSurface } from "@/lib/chat/planning-surface";
import { executeChatTool, toolsForSurface } from "./chat-tools";
import {
  buildChatSystemPrompt,
  buildSystemPrompt,
  type KashRegister,
  resolveChatRegister,
} from "./system-prompts";

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

  const { text } = await generateText({
    model: requireModel("fast"),
    maxOutputTokens: 80,
    temperature: 0.6,
    system: buildSystemPrompt("narration"),
    messages: [{ role: "user", content: userPayload }],
  });

  const trimmed = text.trim();
  if (!trimmed) return fallbackNarration(task);
  return trimmed;
}

export function fallbackNarration(task: Pick<NarrationInput, "title" | "isTop3">): string {
  return task.isTop3
    ? `Going with **${task.title}** — it's Top 3.`
    : `Going with **${task.title}** — next on your list.`;
}

export function buildModelMessages(
  history: { role: "user" | "assistant"; text: string }[],
  contextBlock: string,
  latestUserText: string
): ModelMessage[] {
  const contextPrefix = `Current context:\n${contextBlock}\n\n---\n\n`;
  const prior: ModelMessage[] = history.slice(-18).map((m) => ({ role: m.role, content: m.text }));

  return [...prior, { role: "user", content: contextPrefix + latestUserText }];
}

type ToolExecContext = {
  register: KashRegister;
  threadId: string;
  captureContext?: CaptureContext | null;
};

type CompanionState = {
  fullText: string;
  mutatedTasks: boolean;
  pendingProposal: ProposedAction | null;
  toolErrors: string[];
};

/**
 * Wrap each provider-neutral tool definition as a live AI SDK tool. The `execute` callback
 * runs the existing dispatcher (`executeChatTool`) and records its side effects — mutated
 * tasks, tool errors, and (merged) proposals — into the shared per-turn `state`. Proposals
 * are queued so the stream loop can emit them in order right after the tool result lands.
 */
function buildTools(
  toolDefs: ChatToolDef[],
  userId: string,
  ctx: ToolExecContext,
  state: CompanionState,
  proposalQueue: ProposedAction[]
): ToolSet {
  const entries = toolDefs.map((def) => {
    const t = tool({
      description: def.description,
      inputSchema: jsonSchema(def.input_schema),
      execute: async (input: unknown) => {
        const result = await executeChatTool(userId, def.name, input, ctx);
        if (result.mutatedTasks) state.mutatedTasks = true;
        if (result.error) state.toolErrors.push(result.error);
        if (result.proposal) {
          state.pendingProposal = mergeProposals(state.pendingProposal, result.proposal);
          proposalQueue.push(state.pendingProposal);
        }
        return result.content;
      },
    });
    return [def.name, t] as const;
  });

  return Object.fromEntries(entries);
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
  getToolErrors: () => string[];
}> {
  const register = resolveChatRegister(params.threadId, params.planningSurface);
  const toolDefs = toolsForSurface(register, params.planningSurface);
  const { contextBlock, history } = await assembleChatContext(
    params.userId,
    params.threadId,
    params.captureContext,
    params.planningSurface
  );
  const captureBlock = params.captureContext
    ? formatCaptureContextBlock(params.captureContext)
    : null;
  const enrichedContext = captureBlock ? `${contextBlock}\n\n${captureBlock}` : contextBlock;
  const messages = buildModelMessages(history, enrichedContext, params.userText);

  const state: CompanionState = {
    fullText: "",
    mutatedTasks: false,
    pendingProposal: null,
    toolErrors: [],
  };

  // Proposals produced by tool `execute` callbacks land here, then the stream loop drains
  // them as `proposal` deltas in order — preserving the original mid-stream emission.
  const proposalQueue: ProposedAction[] = [];
  const tools = buildTools(
    toolDefs,
    params.userId,
    { register, threadId: params.threadId, captureContext: params.captureContext },
    state,
    proposalQueue
  );

  async function* run(): AsyncGenerator<CompanionStreamDelta> {
    const result = streamText({
      model: requireModel("chat"),
      system: buildChatSystemPrompt(params.threadId, params.planningSurface, params.captureContext),
      messages,
      tools,
      stopWhen: stepCountIs(MAX_TOOL_ROUNDS),
      abortSignal: params.signal,
      maxOutputTokens: 2048,
    });

    for await (const part of result.fullStream) {
      // Emit any proposals whose tools finished executing before this part.
      while (proposalQueue.length) {
        yield { type: "proposal", proposal: proposalQueue.shift() as ProposedAction };
      }
      if (params.signal?.aborted) break;

      if (part.type === "text-delta") {
        state.fullText += part.text;
        yield { type: "delta", text: part.text };
      } else if (part.type === "error") {
        // Surface provider/stream errors to the route's catch so it emits an error event.
        throw part.error;
      }
    }

    // Flush any proposal from the final tool round.
    while (proposalQueue.length) {
      yield { type: "proposal", proposal: proposalQueue.shift() as ProposedAction };
    }
  }

  return {
    stream: run(),
    getFullText: () => state.fullText,
    getMutatedTasks: () => state.mutatedTasks,
    getPendingProposal: () => state.pendingProposal,
    getToolErrors: () => state.toolErrors,
  };
}

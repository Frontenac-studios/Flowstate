import "server-only";

import { GLOBAL_THREAD_ID } from "@/lib/chat/threads";
import { getAnthropicConfig, isAnthropicConfigured } from "@/lib/env";
import type { SlippedTop3Task, StalledTop3Task } from "@/lib/nudges/evaluate-top3-stall";
import { templateStallNudge } from "@/lib/nudges/template-nudge";

import { assembleChatContext } from "./assemble-chat-context";
import { requireAnthropicClient } from "./client";
import { buildSystemPrompt } from "./system-prompts";

export async function generateNudge(
  userId: string,
  stalled: StalledTop3Task[],
  slipped: SlippedTop3Task[]
): Promise<string> {
  if (!isAnthropicConfigured()) {
    return templateStallNudge(stalled, slipped);
  }

  const anthropic = requireAnthropicClient();
  const config = getAnthropicConfig();
  if (!config.configured) {
    return templateStallNudge(stalled, slipped);
  }

  const { contextBlock } = await assembleChatContext(userId, GLOBAL_THREAD_ID);

  const stalledLines =
    stalled.length === 0
      ? "(none)"
      : stalled.map((t) => `  slot ${t.top3Order}: ${t.title}`).join("\n");

  const slippedLines =
    slipped.length === 0
      ? "(none)"
      : slipped.map((t) => `  slot ${t.top3Order}: ${t.title} (${t.daysSlipped} days)`).join("\n");

  const userPayload = [
    "Write one short proactive nudge (max ~50 words) for the global planning chat.",
    "The user has incomplete Top 3 tasks that have not had focus time today, and it is past 2pm their time.",
    "Tone: gentle, supportive, never guilt-tripping. Suggest a ⌘D pick. Wrap the main task title in backticks, e.g. `Task title`.",
    "Do not use bullet lists.",
    "",
    `Stalled today (no focus session):`,
    stalledLines,
    "",
    `Slipped 2+ days on Top 3:`,
    slippedLines,
    "",
    "Context:",
    contextBlock,
  ].join("\n");

  try {
    const response = await anthropic.messages.create({
      model: config.model,
      max_tokens: 120,
      temperature: 0.5,
      system: buildSystemPrompt("companion"),
      messages: [{ role: "user", content: userPayload }],
    });

    const block = response.content.find((b) => b.type === "text");
    const text = block?.type === "text" ? block.text.trim() : "";
    if (!text) return templateStallNudge(stalled, slipped);
    return text;
  } catch {
    return templateStallNudge(stalled, slipped);
  }
}

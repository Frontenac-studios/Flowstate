import "server-only";

import { generateText } from "ai";

import { GLOBAL_THREAD_ID } from "@/lib/chat/threads";
import { getModelConfig, isModelConfigured } from "@/lib/env";
import type { SlippedTop3Task, StalledTop3Task } from "@/lib/nudges/evaluate-top3-stall";
import { templateStallNudge } from "@/lib/nudges/template-nudge";

import { assembleChatContext } from "./assemble-chat-context";
import { requireModel } from "./client";
import { buildSystemPrompt } from "./system-prompts";

export async function generateNudge(
  userId: string,
  stalled: StalledTop3Task[],
  slipped: SlippedTop3Task[]
): Promise<string> {
  if (!isModelConfigured()) {
    return templateStallNudge(stalled, slipped);
  }

  const config = getModelConfig();
  if (!config.configured) {
    return templateStallNudge(stalled, slipped);
  }

  const { aboutMeBlock, contextBlock } = await assembleChatContext(userId, GLOBAL_THREAD_ID);

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
    "About me:",
    aboutMeBlock,
    "",
    "Context:",
    contextBlock,
  ].join("\n");

  try {
    const { text: raw } = await generateText({
      model: requireModel(),
      maxOutputTokens: 120,
      temperature: 0.5,
      system: buildSystemPrompt("companion"),
      messages: [{ role: "user", content: userPayload }],
    });

    const text = raw.trim();
    if (!text) return templateStallNudge(stalled, slipped);
    return text;
  } catch {
    return templateStallNudge(stalled, slipped);
  }
}

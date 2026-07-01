import "server-only";

import {
  buildGentleEodWinPrompt,
  type ReflectionBeatDayContext,
  type ReflectionBeatResult,
  templateReflectionBeat,
} from "@/lib/daily-wins/reflection-beat";
import type { WinProposal } from "@/lib/daily-wins/types";
import { getAnthropicConfig, isAnthropicConfigured } from "@/lib/env";

import { requireAnthropicClient } from "./client";
import { fetchAboutMeContextBlock } from "./fetch-about-me-context";
import { buildSystemPrompt } from "./system-prompts";

export type ReflectionBeatGenerateInput = {
  userId: string;
  baseProposals: WinProposal[];
  dayContext: ReflectionBeatDayContext;
};

function applyProposalLabelOverrides(
  baseProposals: WinProposal[],
  overrides: Array<{ refId?: string; label?: string }>
): WinProposal[] {
  const labelByRef = new Map<string, string>();
  for (const row of overrides) {
    if (!row.refId || !row.label?.trim()) continue;
    labelByRef.set(row.refId, row.label.trim());
  }

  return baseProposals.map((proposal) => {
    const label = labelByRef.get(proposal.refId);
    return label ? { ...proposal, label } : proposal;
  });
}

function parseReflectionBeatResponse(
  text: string,
  baseProposals: WinProposal[],
  dayContext: ReflectionBeatDayContext
): ReflectionBeatResult | null {
  const trimmed = text.trim();
  try {
    const json = JSON.parse(trimmed) as {
      proposals?: Array<{ refId?: string; label?: string }>;
      gentlePrompt?: string | null;
    };

    const reworded = applyProposalLabelOverrides(baseProposals, json.proposals ?? []);
    const gentlePrompt =
      json.gentlePrompt === null
        ? null
        : typeof json.gentlePrompt === "string" && json.gentlePrompt.trim()
          ? json.gentlePrompt.trim()
          : buildGentleEodWinPrompt(dayContext, reworded);

    return { proposals: reworded, gentlePrompt };
  } catch {
    return null;
  }
}

export async function generateReflectionBeat(
  input: ReflectionBeatGenerateInput
): Promise<ReflectionBeatResult> {
  const fallback = templateReflectionBeat(input.baseProposals, [], input.dayContext);

  if (!isAnthropicConfigured()) {
    return fallback;
  }

  const config = getAnthropicConfig();
  if (!config.configured) {
    return fallback;
  }

  const aboutMe = await fetchAboutMeContextBlock(input.userId);
  const proposalLines =
    input.baseProposals.length === 0
      ? "(none ranked yet)"
      : input.baseProposals
          .map((p, i) => `  ${i + 1}. [${p.refId}] ${p.label} (${p.source})`)
          .join("\n");

  const userPayload = [
    "Reflection register: end-of-day daily wins beat.",
    'Respond with JSON only: {"proposals":[{"refId":"...","label":"..."}],"gentlePrompt":"..." | null}',
    "proposals: up to 3 items — reword labels warmly using ONLY refIds from the ranked list below; do not invent new refIds.",
    "gentlePrompt: at most one short gentle line, or null. Never guilt-trip for zero wins. Never say the user missed wins or failed.",
    "If the day was quiet with no ranked wins and no activity, gentlePrompt must be null.",
    "",
    `Win date: ${input.dayContext.winDate}`,
    `Completions today: ${input.dayContext.completionsToday}`,
    `Top 3 done: ${input.dayContext.top3DoneCount}`,
    `Care events: ${input.dayContext.careEventCount}`,
    `Accepted wins already: ${input.dayContext.acceptedWinCount}`,
    "",
    "Ranked candidates (F1):",
    proposalLines,
    "",
    aboutMe,
  ].join("\n");

  try {
    const anthropic = requireAnthropicClient();
    const response = await anthropic.messages.create({
      model: config.model,
      max_tokens: 280,
      temperature: 0.6,
      system: `${buildSystemPrompt("eod")}

Mode: daily wins reflection beat.
Output valid JSON only with keys "proposals" (array of {refId, label}) and "gentlePrompt" (string or null).
Do not invent tasks, care events, or refIds not in the ranked list.`,
      messages: [{ role: "user", content: userPayload }],
    });

    const block = response.content.find((b) => b.type === "text");
    const text = block?.type === "text" ? block.text.trim() : "";
    if (!text) return fallback;

    const parsed = parseReflectionBeatResponse(text, input.baseProposals, input.dayContext);
    if (!parsed) return fallback;

    const gatedPrompt = buildGentleEodWinPrompt(input.dayContext, parsed.proposals);
    if (parsed.gentlePrompt && !gatedPrompt) {
      return { ...parsed, gentlePrompt: null };
    }
    if (gatedPrompt && !parsed.gentlePrompt) {
      return { ...parsed, gentlePrompt: gatedPrompt };
    }

    return parsed;
  } catch {
    return fallback;
  }
}

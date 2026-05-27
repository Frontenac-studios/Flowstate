import "server-only";

import { getAnthropicConfig, isAnthropicConfigured } from "@/lib/env";
import type { EodFocusBar, Top3Status } from "@/lib/eod/types";
import { formatTop3ForPrompt, templateEodReview } from "@/lib/eod/template-eod-review";

import { requireAnthropicClient } from "./client";
import { buildSystemPrompt } from "./system-prompts";

export type EodReviewGenerateInput = {
  completionsToday: number;
  top3Status: Top3Status;
  focusBars: EodFocusBar[];
  focusOverflowCount: number;
};

export type EodReviewGenerateResult = {
  summary: string;
  reflectiveQuestion: string;
};

function templateFromInput(input: EodReviewGenerateInput): EodReviewGenerateResult {
  const focusSecondsTotal = input.focusBars.reduce((sum, b) => sum + b.seconds, 0);
  return templateEodReview({
    completionsToday: input.completionsToday,
    top3Status: input.top3Status,
    focusSecondsTotal,
    focusTaskCount: input.focusBars.length + input.focusOverflowCount,
  });
}

function parseEodResponse(text: string): EodReviewGenerateResult | null {
  const trimmed = text.trim();
  try {
    const json = JSON.parse(trimmed) as { summary?: string; reflectiveQuestion?: string };
    if (json.summary && json.reflectiveQuestion) {
      return {
        summary: json.summary.trim(),
        reflectiveQuestion: json.reflectiveQuestion.trim(),
      };
    }
  } catch {
    /* fall through */
  }

  const summaryMatch = trimmed.match(/summary:\s*([\s\S]*?)(?=reflectiveQuestion:|$)/i);
  const questionMatch = trimmed.match(/reflectiveQuestion:\s*([\s\S]*)/i);
  if (summaryMatch?.[1] && questionMatch?.[1]) {
    return {
      summary: summaryMatch[1].trim(),
      reflectiveQuestion: questionMatch[1].trim(),
    };
  }

  return null;
}

export async function generateEodReview(
  input: EodReviewGenerateInput
): Promise<EodReviewGenerateResult> {
  const fallback = templateFromInput(input);

  if (!isAnthropicConfigured()) {
    return fallback;
  }

  const config = getAnthropicConfig();
  if (!config.configured) {
    return fallback;
  }

  const focusLines =
    input.focusBars.length === 0
      ? "(no focus time logged today)"
      : input.focusBars.map((b) => `  ${b.title}: ${Math.round(b.seconds / 60)} min`).join("\n");

  const userPayload = [
    "Write an end-of-day review for the user.",
    'Respond with JSON only: {"summary":"...","reflectiveQuestion":"..."}',
    "summary: 2-4 sentences, reflective and supportive; use **bold** sparingly for numbers.",
    "reflectiveQuestion: one open question, no lists.",
    "Use only facts below — do not invent tasks or times.",
    "",
    `Completions today: ${input.completionsToday}`,
    "Top 3:",
    formatTop3ForPrompt(input.top3Status),
    "",
    "Focus time today:",
    focusLines,
    input.focusOverflowCount > 0
      ? `  (+${input.focusOverflowCount} more tasks with focus time)`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const anthropic = requireAnthropicClient();
    const response = await anthropic.messages.create({
      model: config.model,
      max_tokens: 320,
      temperature: 0.7,
      system: buildSystemPrompt("eod"),
      messages: [{ role: "user", content: userPayload }],
    });

    const block = response.content.find((b) => b.type === "text");
    const text = block?.type === "text" ? block.text.trim() : "";
    if (!text) return fallback;

    const parsed = parseEodResponse(text);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

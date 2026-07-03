import "server-only";

import type { ProjectProgressRow } from "@/lib/projects/aggregate-project-phase-progress";
import { categorySeedLabel } from "@/lib/projects/category-tokens";
import { formatDuration } from "@/lib/time/duration";
import { getAnthropicConfig, isAnthropicConfigured } from "@/lib/env";
import { templateEowReview } from "@/lib/eow/template-eow-review";

import { requireAnthropicClient } from "./client";
import { buildSystemPrompt } from "./system-prompts";

export type EowReviewGenerateInput = {
  totalSeconds: number;
  completionsThisWeek: number;
  byCategory: ReadonlyArray<{ category: string; seconds: number }>;
  byProject: ReadonlyArray<{ projectName: string | null; seconds: number }>;
  projectProgress: readonly ProjectProgressRow[];
  overCommitDriftNote?: string | null;
};

export type EowReviewGenerateResult = {
  summary: string;
};

function templateFromInput(input: EowReviewGenerateInput): EowReviewGenerateResult {
  return templateEowReview(input);
}

function parseEowResponse(text: string): EowReviewGenerateResult | null {
  const trimmed = text.trim();
  try {
    const json = JSON.parse(trimmed) as { summary?: string };
    if (json.summary) return { summary: json.summary.trim() };
  } catch {
    /* fall through */
  }

  const summaryMatch = trimmed.match(/summary:\s*([\s\S]*)/i);
  if (summaryMatch?.[1]) {
    return { summary: summaryMatch[1].trim() };
  }

  return null;
}

export async function generateEowReview(
  input: EowReviewGenerateInput
): Promise<EowReviewGenerateResult> {
  const fallback = templateFromInput(input);

  if (!isAnthropicConfigured()) {
    return fallback;
  }

  const config = getAnthropicConfig();
  if (!config.configured) {
    return fallback;
  }

  const categoryLines =
    input.byCategory.length === 0
      ? "(no focus time by category)"
      : input.byCategory
          .map(
            (row) => `  ${categorySeedLabel(row.category as never)}: ${formatDuration(row.seconds)}`
          )
          .join("\n");

  const projectTimeLines =
    input.byProject.length === 0
      ? "(no focus time by project)"
      : input.byProject
          .map((row) => `  ${row.projectName ?? "No project"}: ${formatDuration(row.seconds)}`)
          .join("\n");

  const progressLines =
    input.projectProgress.length === 0
      ? "(no project tasks)"
      : input.projectProgress
          .map(
            (row) =>
              `  ${row.projectName}: ${row.percent}% (${row.completedWeight}/${row.totalWeight} weight)`
          )
          .join("\n");

  const userPayload = [
    "Write an end-of-week review for the user — narrate wins with warmth, no guilt.",
    'Respond with JSON only: {"summary":"..."}',
    "summary: 2-4 sentences, reflective and supportive; use **bold** sparingly for numbers and project names.",
    "Use only facts below — do not invent tasks, projects, or times.",
    "",
    `Completions this week: ${input.completionsThisWeek}`,
    `Total focus time: ${formatDuration(input.totalSeconds)}`,
    "",
    "Focus by category:",
    categoryLines,
    "",
    "Focus by project:",
    projectTimeLines,
    "",
    "Weighted completion progress:",
    progressLines,
    input.overCommitDriftNote
      ? [
          "",
          "Reflection register note (include gently if relevant):",
          input.overCommitDriftNote,
        ].join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const anthropic = requireAnthropicClient();
    const response = await anthropic.messages.create({
      model: config.model,
      max_tokens: 320,
      temperature: 0.7,
      system: buildSystemPrompt("eow"),
      messages: [{ role: "user", content: userPayload }],
    });

    const block = response.content.find((b) => b.type === "text");
    const text = block?.type === "text" ? block.text.trim() : "";
    if (!text) return fallback;

    const parsed = parseEowResponse(text);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

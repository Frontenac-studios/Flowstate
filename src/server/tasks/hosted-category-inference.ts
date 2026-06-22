import "server-only";

import type Anthropic from "@anthropic-ai/sdk";

import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";
import { inferCategoryFromDistribution } from "@/lib/tasks/category-distribution";
import { type CategoryInference } from "@/lib/tasks/resolveTaskCategory";
import { getAnthropicClient } from "@/server/claude/client";

// Phase 1 (1H / 1.AId / C4): the server create path runs the SHARPER HOSTED model (Haiku)
// behind the same {category, confidence} seam the local embeddings classifier uses live on
// the client. Hosting server inference keeps onnxruntime-node's ~355MB native binary out of
// the serverless function bundle (Vercel's function-size limit) while staying AI-forward
// (Model C) — the live composer still runs the local model for the per-keystroke accent bar.
// Provider abstains to `null` on any error or when no API key is configured; never throws.

// Deliberately Haiku, not the chat/narration model (config.model): this runs once per loose
// create where accuracy and latency both matter, mirroring the bulk backfill's model choice.
const CATEGORY_MODEL = "claude-haiku-4-5-20251001";

// Mirrors scripts/backfill-loose-task-categories.cjs and the data-spine §7 category guide.
const CATEGORY_GUIDE: Record<ProjectCategory, string> = {
  professional: "paid work, job, clients, meetings, work projects",
  personal_projects: "self-directed creative or learning projects, hobbies, side builds",
  relationships: "family, friends, partner, social plans, gifts, staying in touch",
  body_mind: "health, fitness, exercise, medical/dental, rest, mindfulness",
  adulting: "chores, errands, bills, admin, home maintenance, logistics",
};

/** Layer-3 inference: ask the hosted model for a category distribution, parse + gate it. */
export async function inferCategory(title: string): Promise<CategoryInference | null> {
  if (!title.trim()) return null;

  const anthropic = getAnthropicClient();
  if (!anthropic) return null; // unconfigured → no opinion; resolver falls through (1.4d).

  try {
    const guide = PROJECT_CATEGORIES.map((c) => `- ${c}: ${CATEGORY_GUIDE[c]}`).join("\n");
    const message = await anthropic.messages.create({
      model: CATEGORY_MODEL,
      max_tokens: 200,
      system:
        "You categorize a single personal to-do into five life areas. Respond with ONLY a " +
        "JSON object mapping each category key to a probability between 0 and 1 (they should " +
        "sum to about 1), reflecting how well the task fits each area. No prose.\n\n" +
        guide,
      messages: [{ role: "user", content: `Task: "${title}"` }],
    });

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    return inferCategoryFromDistribution(text);
  } catch {
    return null; // any error = abstain, never throw (mirrors the local provider).
  }
}

/** Hosted model — nothing to warm. Kept for parity with the local provider's seam. */
export async function warmCategoryInference(): Promise<void> {}

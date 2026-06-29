import "server-only";

import type Anthropic from "@anthropic-ai/sdk";

import { normalizeTag } from "@/lib/abyss/tags";
import { getAnthropicClient } from "@/server/claude/client";

// §7A: on explicit request only, suggest a short tag name for an un-tagged emerging
// cluster. One cheap Haiku call; abstains to null on any error or missing key (never
// throws) so naming stays optional and the List never blocks on it.
const NAME_MODEL = "claude-haiku-4-5-20251001";

/** Suggest a one- or two-word tag for a cluster of parked-item titles, or null. */
export async function suggestClusterName(titles: string[]): Promise<string | null> {
  const sample = titles
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 12);
  if (sample.length === 0) return null;

  const anthropic = getAnthropicClient();
  if (!anthropic) return null;

  try {
    const message = await anthropic.messages.create({
      model: NAME_MODEL,
      max_tokens: 16,
      system:
        "You name a cluster of related backburner notes with ONE short tag: one or two " +
        "lowercase words, no punctuation, no '#'. Reply with ONLY the tag.",
      messages: [{ role: "user", content: sample.map((t) => `- ${t}`).join("\n") }],
    });

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    return normalizeTag(text) || null;
  } catch {
    return null;
  }
}

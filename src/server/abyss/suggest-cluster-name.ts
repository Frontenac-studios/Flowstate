import "server-only";

import { generateText } from "ai";

import { normalizeTag } from "@/lib/abyss/tags";
import { getModel } from "@/server/claude/client";

// §7A: on explicit request only, suggest a short tag name for an un-tagged emerging
// cluster. One cheap call on the global OPENROUTER_MODEL; abstains to null on any error or
// missing key (never throws) so naming stays optional and the List never blocks on it.

/** Suggest a one- or two-word tag for a cluster of parked-item titles, or null. */
export async function suggestClusterName(titles: string[]): Promise<string | null> {
  const sample = titles
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 12);
  if (sample.length === 0) return null;

  const model = getModel();
  if (!model) return null;

  try {
    const { text } = await generateText({
      model,
      maxOutputTokens: 16,
      system:
        "You name a cluster of related backburner notes with ONE short tag: one or two " +
        "lowercase words, no punctuation, no '#'. Reply with ONLY the tag.",
      messages: [{ role: "user", content: sample.map((t) => `- ${t}`).join("\n") }],
    });

    return normalizeTag(text.trim()) || null;
  } catch {
    return null;
  }
}

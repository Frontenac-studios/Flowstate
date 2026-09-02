import "server-only";

import { generateObject } from "ai";

import {
  buildOutreachPrompt,
  draftResultSchema,
  type DraftResult,
  type OutreachInputs,
} from "@/lib/sourcing/outreach";
import { requireModel } from "@/server/claude/client";

/**
 * Draft the opener + follow-ups for one lead (W10e). A single structured call —
 * `generateObject` holds the model to the {opener, followUps} shape. Uses the "chat"
 * tier because this is quality-sensitive customer-facing prose. Throws if
 * OPENROUTER_API_KEY isn't configured (the router surfaces that as a clear error).
 */
export async function draftOutreach(inputs: OutreachInputs): Promise<DraftResult> {
  const { system, prompt } = buildOutreachPrompt(inputs);

  const { object } = await generateObject({
    model: requireModel("chat"),
    schema: draftResultSchema,
    system,
    prompt,
  });

  return object;
}

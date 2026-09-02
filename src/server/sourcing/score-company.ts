import "server-only";

import { generateObject } from "ai";

import { requireModel } from "@/server/claude/client";
import {
  buildScoringPrompt,
  scoreResultSchema,
  type ScoreResult,
  type ScoringInputs,
} from "@/lib/sourcing/scoring";

/**
 * Score one prospect against the ICP (W10c). A single structured call —
 * `generateObject` holds the model to the {score, confidence, rationale} shape, so no
 * regex-parsing of free text. Throws if OPENROUTER_API_KEY isn't configured (the
 * router surfaces that as a clear error). Company facts are given in `companyNotes`;
 * autonomous web research that fills them is W10h.
 */
export async function scoreCompany(inputs: ScoringInputs): Promise<ScoreResult> {
  const { system, prompt } = buildScoringPrompt(inputs);

  const { object } = await generateObject({
    model: requireModel("structured"),
    schema: scoreResultSchema,
    system,
    prompt,
  });

  return object;
}

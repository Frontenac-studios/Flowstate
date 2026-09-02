import "server-only";

import { generateObject } from "ai";

import {
  buildDistillPrompt,
  companyFactsSchema,
  mergeSources,
  normalizeCompanyFacts,
  WEB_MAX_RESULTS,
  type CompanyFacts,
} from "@/lib/sourcing/research";
import type { SourcingSegment } from "@/lib/sourcing/types";
import { requireModel } from "@/server/claude/client";
import { getWebResearchAdapter } from "@/server/sourcing/web-research";

/**
 * Research one company (W10h): read the web, then distil what was read into
 * `CompanyFacts` the scoring brain can judge.
 *
 * Two calls, on purpose — see the note in lib/sourcing/research.ts. The first has web
 * access and no schema; the second has a schema and no web access, and is told the
 * write-up is the whole world, so it cannot quietly top up thin research with model
 * knowledge that has no source behind it.
 *
 * Throws when no adapter is configured; the router turns that into a clear error
 * rather than silently scoring a company it never looked up.
 */
export async function researchCompany(inputs: {
  companyName: string;
  companyNotes: string;
  segments: SourcingSegment[];
}): Promise<{ facts: CompanyFacts; provider: string; costUsd: number }> {
  const adapter = getWebResearchAdapter();
  if (!adapter) {
    throw new Error("Web research isn't configured (OPENROUTER_API_KEY).");
  }

  const research = await adapter.research({
    companyName: inputs.companyName,
    companyNotes: inputs.companyNotes,
    segments: inputs.segments,
    maxResults: WEB_MAX_RESULTS,
  });

  const { system, prompt } = buildDistillPrompt({
    companyName: inputs.companyName,
    research: research.text,
    sources: research.sources,
  });

  const { object, providerMetadata } = await generateObject({
    model: requireModel("structured"),
    schema: companyFactsSchema,
    system,
    prompt,
  });

  // Clamp to storage limits here, not in the schema — see the note in
  // lib/sourcing/research.ts. The search has already been paid for by this point,
  // so nothing about the response is allowed to throw the result away.
  const facts = normalizeCompanyFacts({
    ...object,
    sources: mergeSources(research.sources, object.sources),
  });

  // Both calls are billed; the ceiling is enforced against their sum.
  const distillMeta = providerMetadata as
    | { openrouter?: { usage?: { cost?: number } } }
    | undefined;
  const distillCost = distillMeta?.openrouter?.usage?.cost;

  return {
    facts,
    provider: research.provider,
    costUsd: research.costUsd + (typeof distillCost === "number" ? distillCost : 0),
  };
}

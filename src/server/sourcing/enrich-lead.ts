import "server-only";

import { applyEnrichment } from "@/lib/sourcing/enrichment";
import type { CompanyFacts } from "@/lib/sourcing/research";
import { WEB_MAX_RESULTS } from "@/lib/sourcing/research";
import type { EnrichmentMode } from "@/lib/sourcing/types";
import { getEnrichmentAdapter } from "@/server/sourcing/enrichment";

/**
 * Run one gap-fill pass over a lead's researched facts (W10j).
 *
 * Returns the facts unchanged, and a cost of zero, when there is nothing to do —
 * no adapter for the segment, or no gaps left. Callers therefore don't need to guard
 * before calling, and "enrichment ran but found nothing" costs the same as "we didn't
 * bother", which is the honest outcome either way.
 */
export async function enrichLead(inputs: {
  companyName: string;
  facts: CompanyFacts;
  mode: EnrichmentMode | undefined;
}): Promise<{ facts: CompanyFacts; provider: string | null; costUsd: number; resolved: number }> {
  const adapter = getEnrichmentAdapter(inputs.mode);
  const gaps = inputs.facts.unverified;

  if (!adapter || gaps.length === 0) {
    return { facts: inputs.facts, provider: null, costUsd: 0, resolved: 0 };
  }

  const result = await adapter.enrich({
    companyName: inputs.companyName,
    facts: inputs.facts,
    gaps,
    maxResults: WEB_MAX_RESULTS,
  });

  const enriched = applyEnrichment(inputs.facts, result.patch);

  return {
    facts: enriched,
    provider: result.provider,
    costUsd: result.costUsd,
    // What it actually bought: gaps that went away. Reported so a segment whose
    // enrichment never resolves anything is visible rather than quietly billing.
    resolved: gaps.length - enriched.unverified.length,
  };
}

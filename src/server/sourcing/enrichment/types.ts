import type { EnrichmentPatch } from "@/lib/sourcing/enrichment";
import type { CompanyFacts } from "@/lib/sourcing/research";

/**
 * The enrichment seam (W10j). v1 ships one implementation — a second, targeted web
 * search — and the interface exists so a paid data vendor can be added later as a
 * file, not a refactor.
 *
 * The plan's rule is that a vendor gets turned on **per segment, only when confidence
 * runs chronically low** (see `segmentConfidenceHealth`). So an adapter is selected by
 * segment, not globally, and the default costs nothing.
 *
 * A vendor implementation would differ from the web one in a way worth writing down:
 * it returns records, not prose, so it would fill `EnrichmentPatch` directly and skip
 * the model entirely. The interface is shaped around the patch rather than around
 * text for exactly that reason.
 */
export type EnrichmentRequest = {
  companyName: string;
  facts: CompanyFacts;
  /** The unconfirmed items to work on. Never empty — callers check first. */
  gaps: string[];
  maxResults: number;
};

export type EnrichmentResult = {
  patch: EnrichmentPatch;
  provider: string;
  costUsd: number;
};

export interface EnrichmentAdapter {
  readonly id: string;
  enrich(request: EnrichmentRequest): Promise<EnrichmentResult>;
}

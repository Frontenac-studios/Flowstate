import "server-only";

import { isModelConfigured } from "@/lib/env";
import type { EnrichmentMode } from "@/lib/sourcing/types";

import { webGapFillAdapter } from "./web-gap-fill";
import type { EnrichmentAdapter } from "./types";

export type { EnrichmentAdapter, EnrichmentRequest, EnrichmentResult } from "./types";

/**
 * The adapter for a segment's enrichment mode, or null when it should cost nothing.
 *
 * Selected per segment rather than globally (see ./types.ts): the point of the seam
 * is that you can turn a paid vendor on for the one ICP segment whose confidence is
 * chronically low, and leave the rest on the free web pass. A vendor would slot in as
 * a `case "vendor"` here and change nothing else.
 */
export function getEnrichmentAdapter(mode: EnrichmentMode | undefined): EnrichmentAdapter | null {
  if (mode !== "web") return null;
  return isModelConfigured() ? webGapFillAdapter : null;
}

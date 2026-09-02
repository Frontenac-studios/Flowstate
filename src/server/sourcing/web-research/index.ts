import "server-only";

import { isModelConfigured } from "@/lib/env";

import { openRouterWebAdapter } from "./openrouter-web";
import type { WebResearchAdapter } from "./types";

export type {
  DiscoveredCompany,
  DiscoveryRequest,
  DiscoveryResponse,
  ResearchRequest,
  ResearchResponse,
  ResearchSource,
  WebResearchAdapter,
} from "./types";

/**
 * The configured web-research adapter, or null when the app has no way to reach the
 * web. v1 has exactly one: OpenRouter's web plugin, which rides the OPENROUTER_API_KEY
 * the app already needs — so "can we research?" and "can we score?" have the same
 * answer, and there is no second key to forget.
 *
 * Swapping vendors is this function plus one new file (see ./types.ts).
 */
export function getWebResearchAdapter(): WebResearchAdapter | null {
  return isModelConfigured() ? openRouterWebAdapter : null;
}

export function isWebResearchConfigured(): boolean {
  return getWebResearchAdapter() !== null;
}

import "server-only";

import { generateObject, generateText } from "ai";

import {
  buildDiscoveryPrompt,
  buildResearchPrompt,
  discoveryResultSchema,
} from "@/lib/sourcing/research";
import { requireModel } from "@/server/claude/client";

import type {
  DiscoveryRequest,
  DiscoveryResponse,
  ResearchRequest,
  ResearchResponse,
  WebResearchAdapter,
} from "./types";

/**
 * OpenRouter reports the real charge for a call in its response metadata. Reading it
 * rather than estimating from tokens is what lets the 30-day ceiling be enforced
 * against the actual bill.
 */
function costOf(providerMetadata: unknown): number {
  const meta = providerMetadata as { openrouter?: { usage?: { cost?: number } } } | undefined;
  const cost = meta?.openrouter?.usage?.cost;
  return typeof cost === "number" && Number.isFinite(cost) ? cost : 0;
}

/**
 * Web research via OpenRouter's `web` plugin (W10h). The plugin runs the search on
 * OpenRouter's side and splices the results into the prompt before the model sees it,
 * so there is no search API of our own to key, rate-limit or keep alive.
 *
 * **This call costs money per result**, which is why `max_results` is passed
 * explicitly on every request rather than left to the vendor default — the cap lives
 * in the caller (`WEB_MAX_RESULTS`), where it can be read next to the code that
 * decides how often research runs.
 *
 * `generateText`, not `generateObject`: the plugin's whole job is to let the model
 * follow what it finds, and a schema on the same call fights that. The structured
 * shape is imposed by a second, ordinary call (see research-company.ts).
 */
export const openRouterWebAdapter: WebResearchAdapter = {
  id: "openrouter-web",

  async research(request: ResearchRequest): Promise<ResearchResponse> {
    const { system, prompt } = buildResearchPrompt({
      companyName: request.companyName,
      companyNotes: request.companyNotes,
      segments: request.segments,
    });

    const { text, sources, providerMetadata } = await generateText({
      model: requireModel("chat"),
      system,
      prompt,
      providerOptions: {
        openrouter: {
          plugins: [{ id: "web", max_results: request.maxResults }],
        },
      },
    });

    // The AI SDK surfaces the plugin's citations as `sources`; take the URLs from
    // there rather than from the prose, so what we store is what was actually read.
    const cited = sources
      .filter((s): s is typeof s & { url: string } => s.sourceType === "url" && !!s.url)
      .map((s) => ({ title: s.title ?? "", url: s.url }));

    return {
      text,
      sources: cited,
      provider: openRouterWebAdapter.id,
      costUsd: costOf(providerMetadata),
    };
  },

  async discover(request: DiscoveryRequest): Promise<DiscoveryResponse> {
    const { system, prompt } = buildDiscoveryPrompt({
      segments: request.segments,
      exclusions: request.exclusions,
      knownNames: request.knownNames,
      count: request.count,
    });

    // The same two-step shape as research, and for the same reason. A first cut ran
    // the schema and the web plugin on ONE call — the code even argued the exception
    // was safe because the output is just a list of names — and it failed on the
    // first real run with "the model did not return a response". Search and structured
    // output do not co-operate on this provider, whatever the shape of the answer.
    // So: search in prose, extract afterwards.
    const search = await generateText({
      model: requireModel("chat"),
      system,
      prompt,
      providerOptions: {
        openrouter: {
          plugins: [{ id: "web", max_results: request.maxResults }],
        },
      },
    });

    const extraction = await generateObject({
      model: requireModel("structured"),
      schema: discoveryResultSchema,
      system:
        "You extract a list of companies from a research write-up. Include only companies the write-up actually names. Do not add any of your own.",
      prompt: `# Write-up\n${search.text}`,
    });

    return {
      companies: extraction.object.companies,
      provider: openRouterWebAdapter.id,
      costUsd: costOf(search.providerMetadata) + costOf(extraction.providerMetadata),
    };
  },
};

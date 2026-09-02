import "server-only";

import { generateObject, generateText } from "ai";

import { buildGapFillPrompt, enrichmentPatchSchema } from "@/lib/sourcing/enrichment";
import { requireModel } from "@/server/claude/client";

import type { EnrichmentAdapter, EnrichmentRequest, EnrichmentResult } from "./types";

function costOf(providerMetadata: unknown): number {
  const meta = providerMetadata as { openrouter?: { usage?: { cost?: number } } } | undefined;
  const cost = meta?.openrouter?.usage?.cost;
  return typeof cost === "number" && Number.isFinite(cost) ? cost : 0;
}

/**
 * The web-only enrichment of v1: one more search, aimed squarely at the facts the
 * first pass couldn't confirm.
 *
 * Two steps again — search in prose, extract with a schema. This is now the third
 * place that pattern appears, and the reason is the same every time: on this provider
 * a structured-output call and the web plugin do not co-operate. W10i's discovery
 * tried the shortcut and failed on its first real run; this one does not try.
 */
export const webGapFillAdapter: EnrichmentAdapter = {
  id: "web-gap-fill",

  async enrich(request: EnrichmentRequest): Promise<EnrichmentResult> {
    const { system, prompt } = buildGapFillPrompt({
      companyName: request.companyName,
      facts: request.facts,
      gaps: request.gaps,
    });

    const search = await generateText({
      model: requireModel("chat"),
      system,
      prompt,
      providerOptions: {
        openrouter: { plugins: [{ id: "web", max_results: request.maxResults }] },
      },
    });

    const extraction = await generateObject({
      model: requireModel("structured"),
      schema: enrichmentPatchSchema,
      system: [
        "You extract a structured patch from a gap-filling write-up.",
        "`resolved` may contain a gap ONLY if the write-up says a source confirmed it. Copy the gap text verbatim.",
        "Anything the write-up still calls unknown goes in `stillUnverified`.",
      ].join("\n"),
      prompt: [
        `# Gaps that were being worked on\n${request.gaps.map((g) => `- ${g}`).join("\n")}`,
        `# Write-up\n${search.text}`,
      ].join("\n\n"),
    });

    return {
      patch: extraction.object,
      provider: webGapFillAdapter.id,
      costUsd: costOf(search.providerMetadata) + costOf(extraction.providerMetadata),
    };
  },
};

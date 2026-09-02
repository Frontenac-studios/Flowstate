import "server-only";

import { generateText } from "ai";

import { buildResearchPrompt } from "@/lib/sourcing/research";
import { requireModel } from "@/server/claude/client";

import type { ResearchRequest, ResearchResponse, WebResearchAdapter } from "./types";

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

    const { text, sources } = await generateText({
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

    return { text, sources: cited, provider: openRouterWebAdapter.id };
  },
};

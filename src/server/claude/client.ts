import "server-only";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

import { getModelConfig } from "@/lib/env";

let provider: ReturnType<typeof createOpenRouter> | null = null;

/**
 * Returns the configured language model (routed through OpenRouter), or null when no
 * OPENROUTER_API_KEY is set. Every AI call in the app resolves its model here, so the
 * model is swappable via OPENROUTER_MODEL without touching call sites.
 */
export function getModel(): LanguageModel | null {
  const config = getModelConfig();
  if (!config.configured) return null;

  if (!provider) {
    provider = createOpenRouter({
      apiKey: config.apiKey,
      // App attribution on the openrouter.ai dashboard (optional but recommended).
      headers: {
        "HTTP-Referer": "https://flowstate.app",
        "X-Title": "Flowstate",
      },
    });
  }

  return provider(config.model);
}

export function requireModel(): LanguageModel {
  const model = getModel();
  if (!model) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }
  return model;
}

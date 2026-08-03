import "server-only";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

import { getModelConfig, resolveModel, type ModelRole } from "@/lib/env";

let provider: ReturnType<typeof createOpenRouter> | null = null;

/**
 * Returns the configured language model (routed through OpenRouter), or null when no
 * OPENROUTER_API_KEY is set. Pass a `role` to select a per-task model tier; it falls back to
 * OPENROUTER_MODEL when that tier has no override, so callers stay swappable via env alone.
 */
export function getModel(role?: ModelRole): LanguageModel | null {
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

  return provider(resolveModel(role));
}

export function requireModel(role?: ModelRole): LanguageModel {
  const model = getModel(role);
  if (!model) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }
  return model;
}

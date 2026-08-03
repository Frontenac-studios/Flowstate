import { z } from "zod";

const modelEnvSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  OPENROUTER_MODEL: z.string().min(1).optional(),
});

// OpenRouter model slug. Swap this (or set OPENROUTER_MODEL) to route every AI call to a
// different model/provider — e.g. "openai/gpt-4o-mini", "google/gemini-2.5-pro".
export const DEFAULT_MODEL = "anthropic/claude-sonnet-4.5";

export function getModelConfig():
  | { configured: true; apiKey: string; model: string }
  | { configured: false; apiKey: null; model: string } {
  const parsed = modelEnvSchema.safeParse(process.env);
  const model = (parsed.success ? parsed.data.OPENROUTER_MODEL : undefined) ?? DEFAULT_MODEL;
  const apiKey = parsed.success ? parsed.data.OPENROUTER_API_KEY : undefined;

  if (!apiKey) {
    return { configured: false, apiKey: null, model };
  }

  return { configured: true, apiKey, model };
}

export function isModelConfigured(): boolean {
  return getModelConfig().configured;
}

const bingoCoachEnvSchema = z.object({
  KASH_BINGO_COACH_ENABLED: z.string().min(1).optional(),
});

/**
 * Feature gate for the bingo-goals AI coach. Off by default; enable with
 * KASH_BINGO_COACH_ENABLED=1 (or "true"). The coach also requires a model to be
 * configured — callers should treat "enabled" as gated behind isModelConfigured().
 */
export function isBingoCoachEnabled(): boolean {
  const parsed = bingoCoachEnvSchema.safeParse(process.env);
  const raw = parsed.success ? parsed.data.KASH_BINGO_COACH_ENABLED : undefined;
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "1" || normalized === "true";
}

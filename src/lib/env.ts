import { z } from "zod";

const anthropicEnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_MODEL: z.string().min(1).optional(),
});

export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-5-20250929";

export function getAnthropicConfig():
  | { configured: true; apiKey: string; model: string }
  | { configured: false; apiKey: null; model: string } {
  const parsed = anthropicEnvSchema.safeParse(process.env);
  const model =
    (parsed.success ? parsed.data.ANTHROPIC_MODEL : undefined) ?? DEFAULT_ANTHROPIC_MODEL;
  const apiKey = parsed.success ? parsed.data.ANTHROPIC_API_KEY : undefined;

  if (!apiKey) {
    return { configured: false, apiKey: null, model };
  }

  return { configured: true, apiKey, model };
}

export function isAnthropicConfigured(): boolean {
  return getAnthropicConfig().configured;
}

const bingoCoachEnvSchema = z.object({
  KASH_BINGO_COACH_ENABLED: z.string().min(1).optional(),
});

/**
 * Feature gate for the bingo-goals AI coach. Off by default; enable with
 * KASH_BINGO_COACH_ENABLED=1 (or "true"). The coach also requires Anthropic to be
 * configured — callers should treat "enabled" as gated behind isAnthropicConfigured().
 */
export function isBingoCoachEnabled(): boolean {
  const parsed = bingoCoachEnvSchema.safeParse(process.env);
  const raw = parsed.success ? parsed.data.KASH_BINGO_COACH_ENABLED : undefined;
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "1" || normalized === "true";
}

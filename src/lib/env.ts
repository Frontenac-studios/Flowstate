import { z } from "zod";

const anthropicEnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_MODEL: z.string().min(1).optional(),
});

export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

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

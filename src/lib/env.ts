import { z } from "zod";

const modelEnvSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  OPENROUTER_MODEL: z.string().min(1).optional(),
  OPENROUTER_MODEL_CHAT: z.string().min(1).optional(),
  OPENROUTER_MODEL_STRUCTURED: z.string().min(1).optional(),
  OPENROUTER_MODEL_FAST: z.string().min(1).optional(),
});

// OpenRouter model slug used when no per-role override is set. Swap this (or OPENROUTER_MODEL)
// to route every AI call to a different model/provider — e.g. "z-ai/glm-4.7", "openai/gpt-5.1",
// "google/gemini-2.5-flash".
export const DEFAULT_MODEL = "anthropic/claude-sonnet-5";

/**
 * Per-task model tiers. Each falls back to OPENROUTER_MODEL (then DEFAULT_MODEL) when its
 * override env var is unset — so a single OPENROUTER_MODEL still configures the whole app, and
 * you only set the overrides you actually want to differ.
 *
 * - "chat"       → the interactive companion (streaming + tool calling). Quality + reliable
 *                  tool use matter most here. Env: OPENROUTER_MODEL_CHAT.
 * - "structured" → JSON-emitting generators (week draft, EoD/EoW reviews, reflection beat),
 *                  parsed with a strict `{…}` match. Env: OPENROUTER_MODEL_STRUCTURED.
 * - "fast"       → cheap, high-volume, short output (narration, nudges, category inference,
 *                  cluster naming). Env: OPENROUTER_MODEL_FAST.
 */
export type ModelRole = "chat" | "structured" | "fast";

function parseModelEnv(): z.infer<typeof modelEnvSchema> {
  const parsed = modelEnvSchema.safeParse(process.env);
  return parsed.success ? parsed.data : {};
}

function roleOverride(data: z.infer<typeof modelEnvSchema>, role: ModelRole): string | undefined {
  switch (role) {
    case "chat":
      return data.OPENROUTER_MODEL_CHAT;
    case "structured":
      return data.OPENROUTER_MODEL_STRUCTURED;
    case "fast":
      return data.OPENROUTER_MODEL_FAST;
  }
}

/** Resolve the model slug for a task role, falling back to the global model then the default. */
export function resolveModel(role?: ModelRole): string {
  const data = parseModelEnv();
  const global = data.OPENROUTER_MODEL ?? DEFAULT_MODEL;
  if (!role) return global;
  return roleOverride(data, role) ?? global;
}

export function getModelConfig():
  | { configured: true; apiKey: string; model: string }
  | { configured: false; apiKey: null; model: string } {
  const data = parseModelEnv();
  const model = data.OPENROUTER_MODEL ?? DEFAULT_MODEL;
  const apiKey = data.OPENROUTER_API_KEY;

  if (!apiKey) {
    return { configured: false, apiKey: null, model };
  }

  return { configured: true, apiKey, model };
}

export function isModelConfigured(): boolean {
  return getModelConfig().configured;
}

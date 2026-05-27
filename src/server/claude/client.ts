import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { getAnthropicConfig } from "@/lib/env";

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic | null {
  const config = getAnthropicConfig();
  if (!config.configured) return null;

  if (!client) {
    client = new Anthropic({ apiKey: config.apiKey });
  }

  return client;
}

export function requireAnthropicClient(): Anthropic {
  const anthropic = getAnthropicClient();
  if (!anthropic) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }
  return anthropic;
}

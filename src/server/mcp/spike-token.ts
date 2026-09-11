import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import type { AuthInfo } from "@modelcontextprotocol/server";

/**
 * W18a — the transport spike's credential check. Deliberately throwaway: one shared
 * token from the environment, no table, no scopes worth the name. It exists to answer
 * a single question — can Claude Desktop reach this endpoint and present a bearer
 * token? — before W18b builds `mcp_tokens` (hashed, per-device, revocable) on top.
 *
 * Both sides are hashed before comparing. `timingSafeEqual` throws on buffers of
 * unequal length, so comparing raw strings would either throw or need a length check
 * first — and that early exit would itself leak the token's length. Hashing to a fixed
 * 32 bytes makes the comparison constant-time and length-independent at once.
 *
 * Returns `undefined` for anything that is not a match. `withMcpAuth` turns that into
 * a 401, and the caller learns nothing about why.
 */
export function verifySpikeToken(
  bearer: string | undefined,
  expected: string | undefined = process.env.MCP_SPIKE_TOKEN
): AuthInfo | undefined {
  if (!bearer || !expected) return undefined;

  const given = createHash("sha256").update(bearer).digest();
  const wanted = createHash("sha256").update(expected).digest();
  if (!timingSafeEqual(given, wanted)) return undefined;

  return { token: bearer, clientId: "claude-desktop-spike", scopes: ["read"] };
}

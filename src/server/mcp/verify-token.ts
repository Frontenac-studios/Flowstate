import "server-only";

import type { AuthInfo } from "@modelcontextprotocol/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { mcpTokens } from "@/db/tables";
import { MCP_SCOPES, type McpScope } from "@/lib/mcp/scopes";
import { hashMcpToken, looksLikeMcpToken, mcpTokenHashesMatch } from "@/lib/mcp/token";

/** `lastUsedAt` is written at most this often per token — it's a hint, not an audit log. */
const LAST_USED_RESOLUTION_MS = 5 * 60 * 1000;

/** What the MCP tools need from a verified token, carried on `AuthInfo.extra`. */
export type McpAuthExtra = { userId: string };

/**
 * Resolve a bearer token to the user it acts for (W18b).
 *
 * Returns `undefined` for anything that isn't a live token — unknown, revoked,
 * expired, malformed — and never says which. `withMcpAuth` turns that into a bare
 * 401. The token, its prefix and the Authorization header are never logged.
 *
 * The lookup is by SHA-256, so the plaintext never reaches the database; the
 * constant-time re-check of the stored digest is belt and braces on top of that.
 */
export async function verifyMcpToken(
  bearer: string | undefined,
  now: Date = new Date()
): Promise<AuthInfo | undefined> {
  if (!looksLikeMcpToken(bearer)) return undefined;

  const tokenHash = hashMcpToken(bearer);
  const [row] = await db
    .select({
      id: mcpTokens.id,
      userId: mcpTokens.userId,
      tokenHash: mcpTokens.tokenHash,
      scopes: mcpTokens.scopes,
      lastUsedAt: mcpTokens.lastUsedAt,
      expiresAt: mcpTokens.expiresAt,
      revokedAt: mcpTokens.revokedAt,
    })
    .from(mcpTokens)
    .where(eq(mcpTokens.tokenHash, tokenHash))
    .limit(1);

  if (!row || !mcpTokenHashesMatch(row.tokenHash, tokenHash)) return undefined;
  if (row.revokedAt) return undefined;
  if (row.expiresAt && row.expiresAt.getTime() <= now.getTime()) return undefined;

  await touchLastUsed(row.id, row.lastUsedAt, now);

  const scopes = (Array.isArray(row.scopes) ? row.scopes : []).filter((scope): scope is McpScope =>
    (MCP_SCOPES as readonly string[]).includes(scope)
  );

  return {
    token: bearer,
    clientId: row.id,
    scopes,
    ...(row.expiresAt ? { expiresAt: Math.floor(row.expiresAt.getTime() / 1000) } : {}),
    extra: { userId: row.userId } satisfies McpAuthExtra,
  };
}

/**
 * Record that the token was used, at most once per resolution window. Deliberately
 * leaves `updatedAt` alone — see the note on the mcp_tokens schema — and never
 * fails the request: a missed "last used" stamp is not a reason to refuse Claude.
 */
async function touchLastUsed(id: string, lastUsedAt: Date | null, now: Date): Promise<void> {
  if (lastUsedAt && now.getTime() - lastUsedAt.getTime() < LAST_USED_RESOLUTION_MS) return;
  try {
    await db.update(mcpTokens).set({ lastUsedAt: now }).where(eq(mcpTokens.id, id));
  } catch (error) {
    console.error("[mcp] could not record token use", error instanceof Error ? error.message : "");
  }
}

/** The user a verified request acts for, or null if the auth info isn't ours. */
export function mcpUserId(authInfo: AuthInfo | undefined): string | null {
  const userId = (authInfo?.extra as Partial<McpAuthExtra> | undefined)?.userId;
  return typeof userId === "string" && userId.length > 0 ? userId : null;
}

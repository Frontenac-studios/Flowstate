import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * MCP personal access tokens (W18b) — the pure half: minting, hashing and shape
 * checks. The database lookup lives in src/server/mcp/verify-token.ts.
 *
 * Format: `fs_pat_` + 32 random bytes as base64url (43 characters). The prefix makes
 * a leaked token greppable in a secret scan and obvious in a screenshot.
 */
export const MCP_TOKEN_PREFIX = "fs_pat_";
const TOKEN_BODY_LENGTH = 43;
const TOKEN_PATTERN = /^fs_pat_[A-Za-z0-9_-]{43}$/;

/** How many characters of the token body the Settings list shows. Not secret on its own. */
export const MCP_TOKEN_DISPLAY_CHARS = 6;

export type MintedMcpToken = {
  /** The plaintext. Shown to the user once, never stored. */
  token: string;
  /** SHA-256 hex of the plaintext — the only form that is stored. */
  tokenHash: string;
  /** The first few body characters, so the Settings list can tell tokens apart. */
  tokenPrefix: string;
};

export function hashMcpToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function mintMcpToken(): MintedMcpToken {
  const token = `${MCP_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
  return {
    token,
    tokenHash: hashMcpToken(token),
    tokenPrefix: token.slice(
      MCP_TOKEN_PREFIX.length,
      MCP_TOKEN_PREFIX.length + MCP_TOKEN_DISPLAY_CHARS
    ),
  };
}

/**
 * Cheap shape check before any database work, so a random string or a leftover
 * spike token never costs a query.
 */
export function looksLikeMcpToken(value: string | undefined): value is string {
  return (
    typeof value === "string" &&
    value.length === MCP_TOKEN_PREFIX.length + TOKEN_BODY_LENGTH &&
    TOKEN_PATTERN.test(value)
  );
}

/** Constant-time equality of two SHA-256 hex digests. False on any shape mismatch. */
export function mcpTokenHashesMatch(a: string, b: string): boolean {
  if (a.length !== 64 || b.length !== 64) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  MCP_TOKEN_DISPLAY_CHARS,
  hashMcpToken,
  looksLikeMcpToken,
  mcpTokenHashesMatch,
  mintMcpToken,
} from "./token";

describe("mintMcpToken", () => {
  it("mints fs_pat_ + 43 base64url characters", () => {
    const { token } = mintMcpToken();
    expect(token).toMatch(/^fs_pat_[A-Za-z0-9_-]{43}$/);
  });

  it("stores only the hash and a short prefix, never the plaintext", () => {
    const minted = mintMcpToken();
    expect(minted.tokenHash).toBe(hashMcpToken(minted.token));
    expect(minted.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(minted.tokenPrefix).toHaveLength(MCP_TOKEN_DISPLAY_CHARS);
    expect(minted.token.startsWith(`fs_pat_${minted.tokenPrefix}`)).toBe(true);
  });

  it("never mints the same token twice", () => {
    const seen = new Set(Array.from({ length: 200 }, () => mintMcpToken().token));
    expect(seen.size).toBe(200);
  });
});

describe("looksLikeMcpToken", () => {
  it("accepts a minted token", () => {
    expect(looksLikeMcpToken(mintMcpToken().token)).toBe(true);
  });

  it.each([
    ["nothing", undefined],
    ["empty", ""],
    ["no prefix", "x".repeat(50)],
    ["short body", "fs_pat_abc"],
    ["long body", `fs_pat_${"a".repeat(44)}`],
    ["bad characters", `fs_pat_${"a".repeat(42)}!`],
    ["the W18a spike token shape", "fs_pat_route_gate_test_token_value_0123456789"],
  ])("rejects %s", (_label, value) => {
    expect(looksLikeMcpToken(value)).toBe(false);
  });
});

describe("mcpTokenHashesMatch", () => {
  it("matches identical digests and rejects different ones", () => {
    const a = hashMcpToken("one");
    expect(mcpTokenHashesMatch(a, hashMcpToken("one"))).toBe(true);
    expect(mcpTokenHashesMatch(a, hashMcpToken("two"))).toBe(false);
  });

  it("returns false instead of throwing on a malformed digest", () => {
    expect(mcpTokenHashesMatch(hashMcpToken("one"), "abc")).toBe(false);
  });
});

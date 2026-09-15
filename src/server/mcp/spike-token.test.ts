import { describe, expect, it } from "vitest";

import { verifySpikeToken } from "./spike-token";

const TOKEN = "fs_pat_Q2xhdWRlIGNhbiByZWFjaCBGbG93c3RhdGUgbm93IHRydWx5";

describe("verifySpikeToken", () => {
  it("accepts the configured token and reports read scope only", () => {
    expect(verifySpikeToken(TOKEN, TOKEN)).toEqual({
      token: TOKEN,
      clientId: "claude-desktop-spike",
      scopes: ["read"],
    });
  });

  it("rejects a token that differs by one character", () => {
    const nearMiss = TOKEN.slice(0, -1) + (TOKEN.endsWith("y") ? "z" : "y");
    expect(verifySpikeToken(nearMiss, TOKEN)).toBeUndefined();
  });

  it("rejects a token of a different length without throwing", () => {
    // timingSafeEqual throws on unequal-length buffers; hashing first must prevent it.
    expect(() => verifySpikeToken("short", TOKEN)).not.toThrow();
    expect(verifySpikeToken("short", TOKEN)).toBeUndefined();
    expect(verifySpikeToken(TOKEN + "extra", TOKEN)).toBeUndefined();
  });

  it("rejects a missing bearer", () => {
    expect(verifySpikeToken(undefined, TOKEN)).toBeUndefined();
    expect(verifySpikeToken("", TOKEN)).toBeUndefined();
  });

  it("rejects everything when no token is configured, including an empty match", () => {
    expect(verifySpikeToken(TOKEN, undefined)).toBeUndefined();
    expect(verifySpikeToken("", "")).toBeUndefined();
  });
});

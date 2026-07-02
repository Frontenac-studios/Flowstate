import { afterEach, describe, expect, it, vi } from "vitest";

import { DEV_USER_EMAIL, DEV_USER_ID, isAuthBypassed, resolveAuthContext } from "./auth-bypass";

describe("isAuthBypassed", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("bypasses in web development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isAuthBypassed()).toBe(true);
  });

  it("does not bypass web production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isAuthBypassed()).toBe(false);
  });

  it("bypasses release Kash.app sidecar (KASH_DESKTOP, not Vercel)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("KASH_DESKTOP", "1");
    expect(isAuthBypassed()).toBe(true);
  });

  it("does not bypass when KASH_DESKTOP is set on Vercel", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("KASH_DESKTOP", "1");
    vi.stubEnv("VERCEL", "1");
    expect(isAuthBypassed()).toBe(false);
  });
});

describe("resolveAuthContext", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns dev user when bypassed and no session", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(resolveAuthContext(null)).toEqual({
      userId: DEV_USER_ID,
      email: DEV_USER_EMAIL,
    });
  });

  it("prefers a real session over bypass", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(resolveAuthContext({ id: "user-123", email: "a@b.com" })).toEqual({
      userId: "user-123",
      email: "a@b.com",
    });
  });
});

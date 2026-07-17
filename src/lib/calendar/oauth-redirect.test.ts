import { describe, expect, it } from "vitest";

import {
  calendarOAuthCallbackUri,
  isCalendarSyncStale,
  resolveCalendarOAuthRedirectUri,
} from "./oauth-redirect";

describe("resolveCalendarOAuthRedirectUri", () => {
  const envUri = "https://app.example.com/api/calendar/google/callback";

  it("uses 127.0.0.1 desktop origins from the request", () => {
    expect(resolveCalendarOAuthRedirectUri("http://127.0.0.1:3000", envUri)).toBe(
      "http://127.0.0.1:3000/api/calendar/google/callback"
    );
    expect(resolveCalendarOAuthRedirectUri("http://127.0.0.1:4310/settings", envUri)).toBe(
      "http://127.0.0.1:4310/api/calendar/google/callback"
    );
  });

  it("falls back to env when origin is unknown", () => {
    expect(resolveCalendarOAuthRedirectUri("https://evil.example", envUri)).toBe(envUri);
    expect(resolveCalendarOAuthRedirectUri(null, envUri)).toBe(envUri);
  });

  it("allows the env redirect origin itself", () => {
    expect(resolveCalendarOAuthRedirectUri("https://app.example.com/today", envUri)).toBe(
      "https://app.example.com/api/calendar/google/callback"
    );
  });
});

describe("calendarOAuthCallbackUri", () => {
  it("strips trailing slash on origin", () => {
    expect(calendarOAuthCallbackUri("http://localhost:3000/")).toBe(
      "http://localhost:3000/api/calendar/google/callback"
    );
  });
});

describe("isCalendarSyncStale", () => {
  it("is stale when never synced", () => {
    expect(isCalendarSyncStale(null)).toBe(true);
  });

  it("is fresh within the window", () => {
    const now = Date.parse("2026-07-16T12:00:00.000Z");
    expect(isCalendarSyncStale(new Date(now - 5 * 60_000), now)).toBe(false);
  });

  it("is stale past the window", () => {
    const now = Date.parse("2026-07-16T12:00:00.000Z");
    expect(isCalendarSyncStale(new Date(now - 16 * 60_000), now)).toBe(true);
  });
});

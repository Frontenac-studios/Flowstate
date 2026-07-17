import { describe, expect, it } from "vitest";

import { requestOriginFromHeaders } from "./request-origin";

describe("requestOriginFromHeaders", () => {
  it("prefers Host over the parsed request URL", () => {
    const req = new Request("http://localhost:3000/api/calendar/google/connect", {
      headers: { host: "127.0.0.1:3000" },
    });
    expect(requestOriginFromHeaders(req)).toBe("http://127.0.0.1:3000");
  });

  it("uses x-forwarded headers when present", () => {
    const req = new Request("http://127.0.0.1:3000/callback", {
      headers: {
        host: "127.0.0.1:3000",
        "x-forwarded-host": "app.example.com",
        "x-forwarded-proto": "https",
      },
    });
    expect(requestOriginFromHeaders(req)).toBe("https://app.example.com");
  });
});

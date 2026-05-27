import { describe, expect, it } from "vitest";

import { isMondayBlockingRequired } from "./is-monday-blocking-required";

describe("isMondayBlockingRequired", () => {
  const monday = new Date("2026-05-25T09:00:00");
  const tuesday = new Date("2026-05-26T09:00:00");

  it("requires choice on Monday with no stored choice", () => {
    expect(isMondayBlockingRequired("2026-05-25", null, monday)).toBe(true);
  });

  it("does not block Monday after choice for that day", () => {
    expect(isMondayBlockingRequired("2026-05-25", "2026-05-25", monday)).toBe(false);
  });

  it("does not block on Tuesday", () => {
    expect(isMondayBlockingRequired("2026-05-26", null, tuesday)).toBe(false);
  });
});

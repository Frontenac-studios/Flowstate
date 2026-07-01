import { describe, expect, it } from "vitest";

import { planningSurfaceSchema, planningSurfaceFromPathname } from "./planning-surface";

describe("planning-surface", () => {
  it("validates known surfaces", () => {
    expect(planningSurfaceSchema.safeParse("today").success).toBe(true);
    expect(planningSurfaceSchema.safeParse("invalid").success).toBe(false);
  });

  it("maps pathname prefixes", () => {
    expect(planningSurfaceFromPathname("/today/focus")).toBe("today");
    expect(planningSurfaceFromPathname("/settings")).toBeNull();
  });
});

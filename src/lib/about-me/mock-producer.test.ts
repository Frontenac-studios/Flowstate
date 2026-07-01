import { describe, expect, it } from "vitest";

import { mockEodReflectionAboutMeProposals } from "./mock-producer";

describe("mockEodReflectionAboutMeProposals", () => {
  it("skips short reflection", () => {
    expect(mockEodReflectionAboutMeProposals("2026-06-29", "short")).toEqual([]);
  });
});

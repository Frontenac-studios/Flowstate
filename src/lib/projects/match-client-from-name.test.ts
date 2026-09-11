import { describe, expect, it } from "vitest";

import { matchClientFromName } from "./match-client-from-name";

const CLIENTS = [
  { id: "gw", name: "Great White" },
  { id: "gwg", name: "Great White Group" },
  { id: "hume", name: "HUME" },
  { id: "sun", name: "Suncoast" },
];

describe("matchClientFromName", () => {
  it("matches a client named inside the project name", () => {
    expect(matchClientFromName("Suncoast discovery", CLIENTS)?.id).toBe("sun");
  });

  it("is case and punctuation insensitive", () => {
    expect(matchClientFromName("hume — onboarding", CLIENTS)?.id).toBe("hume");
  });

  it("prefers the longest matching client name", () => {
    expect(matchClientFromName("Great White Group Q4 reporting", CLIENTS)?.id).toBe("gwg");
  });

  it("still matches the shorter name when the longer one is absent", () => {
    expect(matchClientFromName("Great White Q4 reporting", CLIENTS)?.id).toBe("gw");
  });

  it("does not match on a partial word", () => {
    expect(matchClientFromName("Humextra rollout", CLIENTS)).toBeNull();
  });

  it("returns null for an empty or unmatched name", () => {
    expect(matchClientFromName("", CLIENTS)).toBeNull();
    expect(matchClientFromName("Internal site refresh", CLIENTS)).toBeNull();
  });
});

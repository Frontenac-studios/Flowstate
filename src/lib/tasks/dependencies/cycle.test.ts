import { describe, expect, it } from "vitest";

import { wouldCreateCycle } from "./cycle";

const edge = (blockerTaskId: string, blockedTaskId: string) => ({ blockerTaskId, blockedTaskId });

describe("wouldCreateCycle", () => {
  it("rejects a self-link", () => {
    expect(wouldCreateCycle([], "a", "a")).toBe(true);
  });

  it("allows the first edge in an empty graph", () => {
    expect(wouldCreateCycle([], "a", "b")).toBe(false);
  });

  it("rejects a direct 2-cycle (A→B already, add B→A)", () => {
    expect(wouldCreateCycle([edge("a", "b")], "b", "a")).toBe(true);
  });

  it("rejects a transitive cycle (A→B, B→C, add C→A)", () => {
    expect(wouldCreateCycle([edge("a", "b"), edge("b", "c")], "c", "a")).toBe(true);
  });

  it("allows a non-cyclic edge (A→B, B→C, add A→C)", () => {
    expect(wouldCreateCycle([edge("a", "b"), edge("b", "c")], "a", "c")).toBe(false);
  });

  it("allows a diamond but rejects the edge that closes it", () => {
    const diamond = [edge("a", "b"), edge("a", "c"), edge("b", "d"), edge("c", "d")];
    expect(wouldCreateCycle(diamond, "a", "d")).toBe(false); // a already reaches d, no loop
    expect(wouldCreateCycle(diamond, "d", "a")).toBe(true); // d→a would close it
  });

  it("treats mixed-kind edges as one combined graph", () => {
    // Whether an edge is project or window is irrelevant to the walk — only ids matter.
    expect(wouldCreateCycle([edge("a", "b"), edge("b", "c")], "c", "a")).toBe(true);
  });

  it("terminates on a pre-existing loop in the data", () => {
    const looped = [edge("a", "b"), edge("b", "a")];
    expect(wouldCreateCycle(looped, "c", "d")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { layoutBlocks } from "./layout-blocks";

type B = { id: string; startMin: number; endMin: number };

const byId = (rows: ReturnType<typeof layoutBlocks<B>>) =>
  Object.fromEntries(rows.map((r) => [r.id, { col: r.col, cols: r.cols }]));

describe("layoutBlocks", () => {
  it("returns [] for no blocks", () => {
    expect(layoutBlocks<B>([])).toEqual([]);
  });

  it("gives a single block full width", () => {
    const out = byId(layoutBlocks([{ id: "a", startMin: 540, endMin: 585 }]));
    expect(out.a).toEqual({ col: 0, cols: 1 });
  });

  it("treats back-to-back blocks as separate (full width each)", () => {
    const out = byId(
      layoutBlocks([
        { id: "a", startMin: 540, endMin: 600 },
        { id: "b", startMin: 600, endMin: 660 },
      ])
    );
    expect(out.a).toEqual({ col: 0, cols: 1 });
    expect(out.b).toEqual({ col: 0, cols: 1 });
  });

  it("puts two overlapping blocks side by side", () => {
    const out = byId(
      layoutBlocks([
        { id: "a", startMin: 540, endMin: 600 },
        { id: "b", startMin: 570, endMin: 630 },
      ])
    );
    expect(out.a).toEqual({ col: 0, cols: 2 });
    expect(out.b).toEqual({ col: 1, cols: 2 });
  });

  it("isolates a non-overlapping block after an overlapping cluster", () => {
    const out = byId(
      layoutBlocks([
        { id: "a", startMin: 0, endMin: 60 },
        { id: "b", startMin: 30, endMin: 90 },
        { id: "c", startMin: 120, endMin: 180 },
      ])
    );
    expect(out.a).toEqual({ col: 0, cols: 2 });
    expect(out.b).toEqual({ col: 1, cols: 2 });
    expect(out.c).toEqual({ col: 0, cols: 1 });
  });

  it("reuses a freed column within a cluster (nested overlaps)", () => {
    // A spans the whole cluster; B then C are disjoint and both fit the 2nd column.
    const out = byId(
      layoutBlocks([
        { id: "a", startMin: 0, endMin: 120 },
        { id: "b", startMin: 30, endMin: 60 },
        { id: "c", startMin: 70, endMin: 100 },
      ])
    );
    expect(out.a).toEqual({ col: 0, cols: 2 });
    expect(out.b).toEqual({ col: 1, cols: 2 });
    expect(out.c).toEqual({ col: 1, cols: 2 });
  });
});

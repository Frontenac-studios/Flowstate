import { describe, expect, it } from "vitest";

import { coalesceMutations, type PendingMutation } from "./coalesce-mutations";

function mut(
  partial: Partial<PendingMutation> & Pick<PendingMutation, "id" | "tableName" | "rowId" | "op">
): PendingMutation {
  return {
    payloadJson: JSON.stringify({ id: partial.rowId, v: partial.id }),
    createdAt: new Date(),
    ...partial,
  };
}

describe("coalesceMutations", () => {
  it("collapses insert→update for the same row into one upsert with the last payload", () => {
    const out = coalesceMutations([
      {
        ...mut({ id: "m1", tableName: "tasks", rowId: "t1", op: "insert" }),
        payloadJson: '{"v":1}',
      },
      {
        ...mut({ id: "m2", tableName: "tasks", rowId: "t1", op: "update" }),
        payloadJson: '{"v":2}',
      },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ table: "tasks", op: "upsert", rowId: "t1" });
    expect(out[0].payload).toEqual({ v: 2 });
    expect(out[0].mutationIds).toEqual(["m1", "m2"]);
  });

  it("lets a trailing delete win over prior upserts (and carries every contributing id)", () => {
    const out = coalesceMutations([
      mut({ id: "m1", tableName: "tasks", rowId: "t1", op: "insert" }),
      mut({ id: "m2", tableName: "tasks", rowId: "t1", op: "update" }),
      mut({ id: "m3", tableName: "tasks", rowId: "t1", op: "delete" }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ op: "delete", rowId: "t1", payload: null });
    expect(out[0].mutationIds).toEqual(["m1", "m2", "m3"]);
  });

  it("keeps distinct rows and tables separate", () => {
    const out = coalesceMutations([
      mut({ id: "m1", tableName: "tasks", rowId: "t1", op: "insert" }),
      mut({ id: "m2", tableName: "tasks", rowId: "t2", op: "insert" }),
      mut({ id: "m3", tableName: "projects", rowId: "t1", op: "insert" }),
    ]);
    expect(out).toHaveLength(3);
  });

  it("returns nothing for an empty outbox", () => {
    expect(coalesceMutations([])).toEqual([]);
  });
});

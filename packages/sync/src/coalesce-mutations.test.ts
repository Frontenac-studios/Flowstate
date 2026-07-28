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

  it("keeps a task's completion on its own lane, separate from ordinary edits of the same row", () => {
    const out = coalesceMutations([
      {
        ...mut({ id: "m1", tableName: "tasks", rowId: "t1", op: "complete" }),
        payloadJson:
          '{"id":"t1","completedAt":"2026-01-02T00:00:00Z","updatedAt":"2026-01-02T00:00:00Z"}',
      },
      {
        ...mut({ id: "m2", tableName: "tasks", rowId: "t1", op: "update" }),
        payloadJson: '{"id":"t1","title":"pinned"}',
      },
    ]);
    expect(out).toHaveLength(2);
    const complete = out.find((u) => u.op === "complete");
    const upsert = out.find((u) => u.op === "upsert");
    expect(complete?.rowId).toBe("t1");
    expect(complete?.payload).toMatchObject({ completedAt: "2026-01-02T00:00:00Z" });
    // The ordinary edit is untouched — completion never collapses into it.
    expect(upsert?.payload).toEqual({ id: "t1", title: "pinned" });
  });

  it("coalesces repeated completion flips on one row to the last state", () => {
    const out = coalesceMutations([
      {
        ...mut({ id: "m1", tableName: "tasks", rowId: "t1", op: "complete" }),
        payloadJson: '{"id":"t1","completedAt":"2026-01-02T00:00:00Z"}',
      },
      {
        ...mut({ id: "m2", tableName: "tasks", rowId: "t1", op: "complete" }),
        payloadJson: '{"id":"t1","completedAt":null}',
      },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].op).toBe("complete");
    expect(out[0].payload).toEqual({ id: "t1", completedAt: null });
    expect(out[0].mutationIds).toEqual(["m1", "m2"]);
  });
});

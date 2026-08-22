import { createSqliteDb, type SqliteDb } from "@kash/db-local";
import { syncWatermarks, tasks } from "@kash/db-local/schema";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { recordSyncMutation } from "./mutation-log";
import { runSync } from "./sync-engine";

// --- Minimal thenable Supabase fake -----------------------------------------
// Records every chained call and resolves it through a single `resolve(q)` so a
// test can assert on pagination windows, filters, and batched writes.

type QueryState = {
  table: string;
  op: "select" | "upsert" | "update" | "delete";
  eq: Record<string, unknown>;
  gte: { col: string; val: unknown } | null;
  in: { col: string; vals: unknown[] } | null;
  orders: { col: string; ascending: boolean }[];
  range: { from: number; to: number } | null;
  rows: unknown;
};

type Resp = { data?: unknown[] | null; error?: unknown };

function createFakeSupabase(resolve: (q: QueryState) => Resp) {
  const calls: QueryState[] = [];

  function makeBuilder(table: string) {
    const q: QueryState = {
      table,
      op: "select",
      eq: {},
      gte: null,
      in: null,
      orders: [],
      range: null,
      rows: undefined,
    };
    const b = {
      select: () => ((q.op = "select"), b),
      upsert: (rows: unknown) => ((q.op = "upsert"), (q.rows = rows), b),
      update: (row: unknown) => ((q.op = "update"), (q.rows = row), b),
      delete: () => ((q.op = "delete"), b),
      eq: (col: string, val: unknown) => ((q.eq[col] = val), b),
      gte: (col: string, val: unknown) => ((q.gte = { col, val }), b),
      in: (col: string, vals: unknown[]) => ((q.in = { col, vals }), b),
      order: (col: string, o: { ascending: boolean }) => (q.orders.push({ col, ...o }), b),
      range: (from: number, to: number) => ((q.range = { from, to }), b),
      then: (onF: (r: Resp) => unknown, onR?: (e: unknown) => unknown) => {
        calls.push({ ...q });
        return Promise.resolve(resolve(q)).then(onF, onR);
      },
    };
    return b;
  }

  return { from: (t: string) => makeBuilder(t), calls };
}

function remoteTask(id: string) {
  return {
    id,
    user_id: "u1",
    title: `task ${id}`,
    priority: 0,
    sort_order: 0,
    is_top_3: false,
    category_unresolved: false,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  };
}

let db: SqliteDb;
beforeEach(() => {
  db = createSqliteDb(":memory:").db;
});

describe("pullRemoteChanges (via runSync)", () => {
  it("pages through changes and drains every page", async () => {
    const fake = createFakeSupabase((q) => {
      if (q.op !== "select") return { error: null };
      if (q.table !== "tasks") return { data: [], error: null };
      const from = q.range?.from ?? 0;
      if (from === 0) return { data: Array.from({ length: 500 }, (_, i) => remoteTask(`a${i}`)) };
      if (from === 500) return { data: Array.from({ length: 10 }, (_, i) => remoteTask(`b${i}`)) };
      return { data: [] };
    });

    const res = await runSync({ db, supabase: fake as never, userId: "u1" });

    expect(res.errors).toEqual([]);
    expect(res.pulled).toBe(510);

    const taskSelects = fake.calls.filter((c) => c.table === "tasks" && c.op === "select");
    expect(taskSelects.map((c) => c.range)).toEqual([
      { from: 0, to: 499 },
      { from: 500, to: 999 },
    ]);

    const stored = await db.select().from(tasks);
    expect(stored).toHaveLength(510);

    const [wm] = await db
      .select()
      .from(syncWatermarks)
      .where(eq(syncWatermarks.tableName, "tasks"));
    expect(wm?.pulledAt).toBeInstanceOf(Date);
  });

  it("isolates a failing table, never re-pulls the full table, and leaves its watermark unset", async () => {
    const fake = createFakeSupabase((q) => {
      if (q.op !== "select") return { error: null };
      if (q.table === "tasks") return { data: null, error: { message: "boom" } };
      return { data: [] };
    });

    const res = await runSync({ db, supabase: fake as never, userId: "u1" });

    expect(res.errors.some((e) => e.startsWith("pull tasks:"))).toBe(true);

    // Every attempt at `tasks` kept the watermark filter — no unfiltered full-table fetch.
    const taskSelects = fake.calls.filter((c) => c.table === "tasks" && c.op === "select");
    expect(taskSelects.length).toBeGreaterThan(0);
    expect(taskSelects.every((c) => c.gte !== null)).toBe(true);

    // Watermark not advanced → next sync resumes from the same point.
    const wm = await db.select().from(syncWatermarks).where(eq(syncWatermarks.tableName, "tasks"));
    expect(wm).toHaveLength(0);
  });
});

describe("pushPendingMutations (via runSync)", () => {
  it("coalesces per row and flushes one batched upsert + one batched delete per table", async () => {
    await recordSyncMutation(db, {
      table: "tasks",
      rowId: "t1",
      op: "insert",
      payload: { id: "t1", userId: "u1", title: "first" },
    });
    await recordSyncMutation(db, {
      table: "tasks",
      rowId: "t1",
      op: "update",
      payload: { id: "t1", userId: "u1", title: "second" },
    });
    await recordSyncMutation(db, {
      table: "tasks",
      rowId: "t2",
      op: "insert",
      payload: { id: "t2", userId: "u1", title: "other" },
    });
    await recordSyncMutation(db, {
      table: "tasks",
      rowId: "t3",
      op: "delete",
      payload: { id: "t3" },
    });

    const fake = createFakeSupabase(() => ({ data: [], error: null }));
    const res = await runSync({ db, supabase: fake as never, userId: "u1" });

    expect(res.errors).toEqual([]);

    const upserts = fake.calls.filter((c) => c.op === "upsert" && c.table === "tasks");
    expect(upserts).toHaveLength(1);
    const rows = upserts[0].rows as Array<{ id: string; title: string }>;
    expect(rows).toHaveLength(2); // t1 (coalesced to "second") + t2
    expect(rows.find((r) => r.id === "t1")?.title).toBe("second");

    const deletes = fake.calls.filter((c) => c.op === "delete" && c.table === "tasks");
    expect(deletes).toHaveLength(1);
    expect(deletes[0].in).toEqual({ col: "id", vals: ["t3"] });

    // All four outbox rows acked.
    const { listPendingMutations } = await import("./mutation-log");
    expect(await listPendingMutations(db)).toHaveLength(0);
  });

  it("never carries completed_at on an ordinary task upsert (so a stale edit can't revert a completion)", async () => {
    // An unrelated edit (e.g. pin/top3) snapshots the full row while it is still
    // locally incomplete — this must not push a null completed_at to the server.
    await recordSyncMutation(db, {
      table: "tasks",
      rowId: "t1",
      op: "update",
      payload: { id: "t1", userId: "u1", title: "pinned", completedAt: null, isTop3: true },
    });

    const fake = createFakeSupabase(() => ({ data: [], error: null }));
    const res = await runSync({ db, supabase: fake as never, userId: "u1" });
    expect(res.errors).toEqual([]);

    const upserts = fake.calls.filter((c) => c.op === "upsert" && c.table === "tasks");
    expect(upserts).toHaveLength(1);
    const row = (upserts[0].rows as Array<Record<string, unknown>>)[0];
    expect(row).not.toHaveProperty("completed_at");
    expect(row.title).toBe("pinned");
  });

  it("pushes completion on a targeted, user-scoped update carrying only completed_at + updated_at", async () => {
    await recordSyncMutation(db, {
      table: "tasks",
      rowId: "t1",
      op: "complete",
      payload: { id: "t1", completedAt: "2026-07-01T00:00:00Z", updatedAt: "2026-07-01T00:00:00Z" },
    });

    const fake = createFakeSupabase(() => ({ data: [], error: null }));
    const res = await runSync({ db, supabase: fake as never, userId: "u1" });
    expect(res.errors).toEqual([]);

    const updates = fake.calls.filter((c) => c.op === "update" && c.table === "tasks");
    expect(updates).toHaveLength(1);
    expect(updates[0].rows).toEqual({
      completed_at: "2026-07-01T00:00:00Z",
      updated_at: "2026-07-01T00:00:00Z",
    });
    expect(updates[0].eq).toEqual({ id: "t1", user_id: "u1" });

    const { listPendingMutations } = await import("./mutation-log");
    expect(await listPendingMutations(db)).toHaveLength(0);
  });

  it("propagates an uncomplete as completed_at = null on the completion lane", async () => {
    await recordSyncMutation(db, {
      table: "tasks",
      rowId: "t1",
      op: "complete",
      payload: { id: "t1", completedAt: null, updatedAt: "2026-07-02T00:00:00Z" },
    });

    const fake = createFakeSupabase(() => ({ data: [], error: null }));
    await runSync({ db, supabase: fake as never, userId: "u1" });

    const updates = fake.calls.filter((c) => c.op === "update" && c.table === "tasks");
    expect(updates).toHaveLength(1);
    expect(updates[0].rows).toMatchObject({ completed_at: null });
  });

  it("a completion and an unrelated edit on the same row push independently", async () => {
    await recordSyncMutation(db, {
      table: "tasks",
      rowId: "t1",
      op: "complete",
      payload: { id: "t1", completedAt: "2026-07-01T00:00:00Z", updatedAt: "2026-07-01T00:00:00Z" },
    });
    await recordSyncMutation(db, {
      table: "tasks",
      rowId: "t1",
      op: "update",
      payload: { id: "t1", userId: "u1", title: "edited", completedAt: null },
    });

    const fake = createFakeSupabase(() => ({ data: [], error: null }));
    await runSync({ db, supabase: fake as never, userId: "u1" });

    const upserts = fake.calls.filter((c) => c.op === "upsert" && c.table === "tasks");
    const updates = fake.calls.filter((c) => c.op === "update" && c.table === "tasks");
    expect(upserts).toHaveLength(1);
    expect(updates).toHaveLength(1);
    // Upsert carries the edit but not completion; the completion write carries the completion.
    expect((upserts[0].rows as Array<Record<string, unknown>>)[0]).not.toHaveProperty(
      "completed_at"
    );
    expect(updates[0].rows).toMatchObject({ completed_at: "2026-07-01T00:00:00Z" });

    const { listPendingMutations } = await import("./mutation-log");
    expect(await listPendingMutations(db)).toHaveLength(0);
  });

  it("queues and pushes offline abyss_items mutations as one coalesced upsert", async () => {
    await recordSyncMutation(db, {
      table: "abyss_items",
      rowId: "a1",
      op: "insert",
      payload: {
        id: "a1",
        userId: "u1",
        title: "Idea one",
        type: "idea",
        status: "active",
      },
    });
    await recordSyncMutation(db, {
      table: "abyss_items",
      rowId: "a2",
      op: "insert",
      payload: {
        id: "a2",
        userId: "u1",
        title: "Idea two",
        type: "idea",
        status: "archived",
      },
    });

    const fake = createFakeSupabase(() => ({ data: [], error: null }));
    const res = await runSync({ db, supabase: fake as never, userId: "u1" });

    expect(res.errors).toEqual([]);

    const upserts = fake.calls.filter((c) => c.op === "upsert" && c.table === "abyss_items");
    expect(upserts).toHaveLength(1);
    const rows = upserts[0].rows as Array<{ id: string; status: string }>;
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.id === "a1")?.status).toBe("active");
    expect(rows.find((r) => r.id === "a2")?.status).toBe("archived");

    const { listPendingMutations } = await import("./mutation-log");
    expect(await listPendingMutations(db)).toHaveLength(0);
  });
});

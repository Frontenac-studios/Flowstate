// @vitest-environment node
import { randomUUID } from "node:crypto";

import { mcpTokens } from "@kash/db-local/schema";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { hashMcpToken } from "@/lib/mcp/token";

const syncFns = vi.hoisted(() => ({ syncMcpTokenRow: vi.fn(async () => undefined) }));
vi.mock("@/db/record-sync-mutation", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...syncFns,
}));

const USER = randomUUID();
const ORG = randomUUID();

describe("mcpTokens router (sqlite)", () => {
  let db: ReturnType<typeof import("@kash/db-local").createSqliteDb>["db"];
  let caller: Awaited<ReturnType<typeof makeCaller>>;

  async function makeCaller(userId = USER) {
    const { createCallerFactory } = await import("@/trpc/init");
    const { appRouter } = await import("@/trpc/routers/_app");
    return createCallerFactory(appRouter)({ userId, email: null, orgId: ORG, role: "owner" });
  }

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("DATABASE_MODE", "sqlite");
    const { createSqliteDb } = await import("@kash/db-local");
    db = createSqliteDb(":memory:").db;
    vi.doMock("@/db", () => ({ db }));
    caller = await makeCaller();
  });

  it("returns the plaintext once, stores only its hash, and records it for sync", async () => {
    const created = await caller.mcpTokens.create({
      name: "Claude Desktop, MacBook",
      expiresInDays: 90,
    });

    expect(created.token).toMatch(/^fs_pat_[A-Za-z0-9_-]{43}$/);
    expect(created).not.toHaveProperty("tokenHash");
    expect(created.scopes).toEqual(["read"]);
    expect(created.expiresAt).toBeInstanceOf(Date);

    const [stored] = db.select().from(mcpTokens).all();
    expect(stored!.tokenHash).toBe(hashMcpToken(created.token));
    expect(JSON.stringify(stored)).not.toContain(created.token);
    expect(syncFns.syncMcpTokenRow).toHaveBeenCalledWith(stored!.id, "insert", expect.anything());
  });

  it("lists tokens without anything that authenticates", async () => {
    await caller.mcpTokens.create({ name: "Laptop", expiresInDays: null });
    const [row] = await caller.mcpTokens.list();
    expect(row).toMatchObject({ name: "Laptop", expiresAt: null, revokedAt: null });
    expect(row).not.toHaveProperty("tokenHash");
    expect(row).not.toHaveProperty("token");
  });

  it("revokes once, and refuses to touch another user's token", async () => {
    const { id } = await caller.mcpTokens.create({ name: "Laptop", expiresInDays: null });

    const stranger = await makeCaller(randomUUID());
    expect(await stranger.mcpTokens.revoke({ id })).toEqual({ revoked: false });

    expect(await caller.mcpTokens.revoke({ id })).toEqual({ revoked: true });
    expect(await caller.mcpTokens.revoke({ id })).toEqual({ revoked: false });
    const [row] = await caller.mcpTokens.list();
    expect(row!.revokedAt).toBeInstanceOf(Date);
    expect(syncFns.syncMcpTokenRow).toHaveBeenLastCalledWith(id, "update", expect.anything());
  });

  it("caps live tokens at ten; a revoked one frees a slot", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 10; i += 1) {
      ids.push((await caller.mcpTokens.create({ name: `Device ${i}`, expiresInDays: null })).id);
    }
    await expect(
      caller.mcpTokens.create({ name: "Eleventh", expiresInDays: null })
    ).rejects.toThrow(/already have 10 active tokens/);
    await caller.mcpTokens.revoke({ id: ids[0]! });
    await expect(
      caller.mcpTokens.create({ name: "Eleventh", expiresInDays: null })
    ).resolves.toHaveProperty("token");
  });

  it("rejects a blank name", async () => {
    await expect(caller.mcpTokens.create({ name: "   ", expiresInDays: null })).rejects.toThrow();
  });
});

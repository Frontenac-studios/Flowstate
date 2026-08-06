import { randomUUID } from "node:crypto";

import { createSqliteDb } from "@kash/db-local";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AppDb } from "@/db";
// Pg-typed handles that resolve to the SQLite mirror at runtime (DATABASE_MODE
// is stubbed below) — the same indirection the app itself uses.
import { orgMemberships, orgs } from "@/db/tables";

import { AmbiguousOrgMembershipError, ensureOrgForUser } from "./ensure-org-for-user";

// Must run before the imports above are evaluated: `src/db/tables.ts` picks the
// Postgres or SQLite table objects at module load, so setting DATABASE_MODE in
// beforeEach would be too late and the service would emit `gen_random_uuid()`.
vi.hoisted(() => {
  process.env.DATABASE_MODE = "sqlite";
});

describe("ensureOrgForUser", () => {
  const userId = randomUUID();
  let db: AppDb;

  beforeEach(() => {
    // Same cast the app uses in src/db/index.ts: the SQLite handle is
    // runtime-compatible with the Postgres Drizzle API for these queries.
    db = createSqliteDb(":memory:").db as unknown as AppDb;
  });

  it("creates an org and an owner membership for a user who has none", async () => {
    const context = await ensureOrgForUser(db, userId);

    expect(context.orgId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(context.role).toBe("owner");

    const allOrgs = await db.select().from(orgs);
    expect(allOrgs).toHaveLength(1);
  });

  it("is idempotent — a second call reuses the same org", async () => {
    const first = await ensureOrgForUser(db, userId);
    const second = await ensureOrgForUser(db, userId);

    expect(second.orgId).toBe(first.orgId);
    expect(await db.select().from(orgs)).toHaveLength(1);
    expect(await db.select().from(orgMemberships)).toHaveLength(1);
  });

  it("keeps users in separate orgs", async () => {
    const mine = await ensureOrgForUser(db, userId);
    const theirs = await ensureOrgForUser(db, randomUUID());

    expect(theirs.orgId).not.toBe(mine.orgId);
  });

  it("throws rather than guessing when a user has two memberships", async () => {
    await ensureOrgForUser(db, userId);
    const [other] = await db.insert(orgs).values({ name: "Second" }).returning({ id: orgs.id });
    await db.insert(orgMemberships).values({ orgId: other.id, userId, role: "member" });

    await expect(ensureOrgForUser(db, userId)).rejects.toBeInstanceOf(AmbiguousOrgMembershipError);
  });

  it("preserves a non-owner role when one already exists", async () => {
    const [org] = await db.insert(orgs).values({ name: "Employer" }).returning({ id: orgs.id });
    await db.insert(orgMemberships).values({ orgId: org.id, userId, role: "member" });

    await expect(ensureOrgForUser(db, userId)).resolves.toEqual({ orgId: org.id, role: "member" });
  });
});

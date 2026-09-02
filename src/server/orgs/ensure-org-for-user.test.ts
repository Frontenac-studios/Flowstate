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

  // Regression: bootstrapping an empty database created TWO orgs for the same
  // user, created_at identical to the millisecond, because the app fires several
  // tRPC batches on first page load and each one ran this bootstrap. Every
  // request afterwards then threw AmbiguousOrgMembershipError and the install was
  // unusable until a row was deleted by hand.
  //
  // better-sqlite3 is synchronous underneath, but the Drizzle builders are
  // awaited, so these calls interleave at exactly the points the real race
  // interleaves at: all six read "no membership" before any of them writes. What
  // stops them is the unique index on `orgs.personal_for_user_id`, not a
  // transaction — which is the whole point, since the old transaction was a no-op
  // here and a READ COMMITTED snapshot in Postgres.
  it("creates exactly one org when the bootstrap runs concurrently", async () => {
    const contexts = await Promise.all(
      Array.from({ length: 6 }, () => ensureOrgForUser(db, userId))
    );

    expect(await db.select().from(orgs)).toHaveLength(1);
    expect(await db.select().from(orgMemberships)).toHaveLength(1);

    // Every caller must agree on the org, not just the database on the count —
    // one racer walking away with a different id is the same bug wearing a
    // different hat.
    expect(new Set(contexts.map((context) => context.orgId)).size).toBe(1);
    for (const context of contexts) {
      expect(context.role).toBe("owner");
    }
  });

  it("keeps concurrent bootstraps for different users apart", async () => {
    const otherUserId = randomUUID();

    const [mine, theirs] = await Promise.all([
      ensureOrgForUser(db, userId),
      ensureOrgForUser(db, otherUserId),
    ]);

    expect(mine.orgId).not.toBe(theirs.orgId);
    expect(await db.select().from(orgs)).toHaveLength(2);
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

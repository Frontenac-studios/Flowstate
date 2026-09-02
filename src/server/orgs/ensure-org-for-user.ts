import "server-only";

import { eq } from "drizzle-orm";

import type { AppDb } from "@/db";
import type { orgRole } from "@/db/schema/org-memberships";
import { orgMemberships, orgs } from "@/db/tables";

export type OrgRole = (typeof orgRole.enumValues)[number];

export type OrgContext = {
  orgId: string;
  role: OrgRole;
};

/**
 * Thrown when a user has more than one membership but no org switcher exists
 * yet. Failing loudly is deliberate: silently picking one is how rows end up
 * written into the wrong tenant.
 */
export class AmbiguousOrgMembershipError extends Error {
  constructor(
    readonly userId: string,
    readonly orgIds: string[]
  ) {
    super(
      `User has ${orgIds.length} org memberships but no active-org selection exists. ` +
        `Build the org switcher before creating a second membership.`
    );
    this.name = "AmbiguousOrgMembershipError";
  }
}

/** Name for the org auto-created for a user who has none. Never user-visible today. */
const DEFAULT_ORG_NAME = "Personal";

/**
 * Bounded retry for the one case the unique index cannot settle in a single
 * round-trip: our INSERT loses the race, and the winner then rolls back, so by
 * the time we read there is no row to find. One retry covers that in practice;
 * the third attempt exists only so a pathological loop still terminates.
 */
const PERSONAL_ORG_ATTEMPTS = 3;

async function findMemberships(db: AppDb, userId: string): Promise<OrgContext[]> {
  const rows = await db
    .select({ orgId: orgMemberships.orgId, role: orgMemberships.role })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, userId));

  return rows.map((row) => ({ orgId: row.orgId, role: row.role }));
}

/**
 * Creates — or finds — the caller's implicit personal org.
 *
 * The uniqueness of `orgs.personal_for_user_id` is what makes this safe, not a
 * transaction. The previous shape (select-then-insert, re-checking inside a
 * transaction) could not work: Postgres runs READ COMMITTED, so both concurrent
 * snapshots see no membership and both insert; and on SQLite the transaction was
 * a documented no-op because better-sqlite3 transactions must be synchronous.
 * The result was two orgs with created_at equal to the millisecond and a context
 * that hard-errored on every request afterwards, an install only a hand-deleted
 * row could rescue.
 *
 * With the index, the loser's `ON CONFLICT DO NOTHING` returns no row and it
 * reads the winner's org back instead.
 */
async function ensurePersonalOrg(db: AppDb, userId: string): Promise<string> {
  for (let attempt = 0; attempt < PERSONAL_ORG_ATTEMPTS; attempt += 1) {
    const [created] = await db
      .insert(orgs)
      .values({ name: DEFAULT_ORG_NAME, personalForUserId: userId })
      .onConflictDoNothing({ target: orgs.personalForUserId })
      .returning({ id: orgs.id });

    if (created) return created.id;

    const [existing] = await db
      .select({ id: orgs.id })
      .from(orgs)
      .where(eq(orgs.personalForUserId, userId));

    if (existing) return existing.id;
  }

  throw new Error(
    `Failed to resolve a personal org for user ${userId} after ${PERSONAL_ORG_ATTEMPTS} attempts.`
  );
}

/**
 * Resolves the caller's org, creating one if they have none.
 *
 * In hosted Postgres a new `auth.users` row already gets an org from the
 * `handle_new_user_org` trigger, so the create path here covers two cases the
 * trigger can't: the dev/desktop auth-bypass user (who has no `auth.users` row
 * at all) and any user who predates the trigger. Dev and production otherwise
 * share this one code path — there is no `DEV_ORG_ID`.
 *
 * Every write below is idempotent under concurrency, which matters because the
 * app fires several tRPC batches on first page load and each one lands here.
 *
 * The db handle is passed in rather than imported so this module stays free of
 * the connection singleton.
 */
export async function ensureOrgForUser(db: AppDb, userId: string): Promise<OrgContext> {
  const existing = await findMemberships(db, userId);

  if (existing.length > 1) {
    throw new AmbiguousOrgMembershipError(
      userId,
      existing.map((membership) => membership.orgId)
    );
  }

  if (existing.length === 1) {
    return existing[0];
  }

  const orgId = await ensurePersonalOrg(db, userId);

  // Idempotent on the pre-existing (org_id, user_id) unique index, so a racing
  // request that already wrote this row is a no-op rather than a second membership.
  await db
    .insert(orgMemberships)
    .values({ orgId, userId, role: "owner" })
    .onConflictDoNothing({ target: [orgMemberships.orgId, orgMemberships.userId] });

  // Read back rather than returning what we meant to write: the winner of a race
  // is the one whose row survives, and a membership written concurrently could
  // in principle carry a different role.
  const settled = await findMemberships(db, userId);

  if (settled.length > 1) {
    throw new AmbiguousOrgMembershipError(
      userId,
      settled.map((membership) => membership.orgId)
    );
  }

  if (settled.length === 0) {
    throw new Error(`Org membership for user ${userId} vanished immediately after being written.`);
  }

  return settled[0];
}

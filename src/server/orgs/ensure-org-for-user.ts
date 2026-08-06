import "server-only";

import { eq } from "drizzle-orm";

import type { AppDb } from "@/db";
import { isSqliteMode } from "@/db/mode";
import type { orgRole } from "@/db/schema/org-memberships";
import { orgMemberships, orgs } from "@/db/tables";

export type OrgRole = (typeof orgRole.enumValues)[number];

export type OrgContext = {
  orgId: string;
  role: OrgRole;
};

/** Transaction handle for whichever driver is active. */
type AppDbTransaction = Parameters<Parameters<AppDb["transaction"]>[0]>[0];

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

async function findMemberships(
  db: AppDb | AppDbTransaction,
  userId: string
): Promise<OrgContext[]> {
  const rows = await db
    .select({ orgId: orgMemberships.orgId, role: orgMemberships.role })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, userId));

  return rows.map((row) => ({ orgId: row.orgId, role: row.role }));
}

/**
 * better-sqlite3 transactions must be synchronous, so on SQLite we run the body
 * against the db handle directly — same trade-off (and same reasoning) as
 * `runAppTransaction`. That helper isn't reused here because it closes over the
 * app-wide db singleton, which would make this module create a database at
 * import time and defeat the injected handle below.
 */
async function withTransaction<T>(db: AppDb, fn: (tx: AppDbTransaction) => Promise<T>): Promise<T> {
  if (isSqliteMode()) {
    return fn(db as unknown as AppDbTransaction);
  }
  return db.transaction(fn);
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

  return withTransaction(db, async (tx) => {
    // Re-check inside the transaction: two concurrent first-requests for the same
    // user would otherwise create two orgs, leaving that user permanently
    // ambiguous. Best-effort on SQLite, which has no real transaction here — the
    // desktop app is single-user and single-process.
    const raced = await findMemberships(tx, userId);
    if (raced.length === 1) return raced[0];
    if (raced.length > 1) {
      throw new AmbiguousOrgMembershipError(
        userId,
        raced.map((membership) => membership.orgId)
      );
    }

    const [org] = await tx
      .insert(orgs)
      .values({ name: DEFAULT_ORG_NAME })
      .returning({ id: orgs.id });

    const role: OrgRole = "owner";
    await tx.insert(orgMemberships).values({ orgId: org.id, userId, role });

    return { orgId: org.id, role };
  });
}

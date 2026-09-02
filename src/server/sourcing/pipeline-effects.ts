import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { syncClientRow, syncLeadRow, syncProjectRow } from "@/db/record-sync-mutation";
import { clients, leads, projects } from "@/db/tables";
import { slugifyProjectName } from "@/lib/projects/slugify";

/**
 * W10f — the side effects a stage change has outside the lead row. Moving a deal
 * through the funnel is not just a state write: first contact earns the prospect a
 * project, signing turns that project into real work with a client attached, and
 * closing it out takes the prospect off the board.
 *
 * These live here rather than in the router so the rules read in one place, and so
 * the router stays a thin transcription of "what the user did".
 *
 * Every write is scoped by `userId` — the app connects over postgres:// as the
 * table owner, so RLS never runs on this path and this scoping IS the enforcement.
 */

type Ctx = { userId: string; orgId: string };

/** A slug no other project of this user holds. */
async function uniqueProjectSlug(userId: string, name: string): Promise<string> {
  const base = slugifyProjectName(name).toLowerCase() || "prospect";
  const taken = new Set(
    (
      await db.select({ slug: projects.slug }).from(projects).where(eq(projects.userId, userId))
    ).map((p) => p.slug)
  );
  let slug = base;
  while (taken.has(slug)) slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  return slug;
}

/**
 * The prospect project for a lead, created on demand. Promotion happens at first
 * contact (see PROMOTES_AT), and this is idempotent: a lead that already carries a
 * `projectId` keeps it, so walking a deal backwards and forwards never spawns
 * duplicates.
 *
 * Returns the project id, and whether this call created it.
 */
export async function ensureProspectProject(
  ctx: Ctx,
  lead: { id: string; companyName: string; projectId: string | null }
): Promise<{ projectId: string; created: boolean }> {
  if (lead.projectId) {
    // The row may have been archived by an earlier close — bring it back.
    const [existing] = await db
      .select({ id: projects.id, archivedAt: projects.archivedAt })
      .from(projects)
      .where(and(eq(projects.id, lead.projectId), eq(projects.userId, ctx.userId)))
      .limit(1);
    if (existing) {
      if (existing.archivedAt) await unarchiveProject(ctx, existing.id);
      return { projectId: existing.id, created: false };
    }
    // The project was deleted out from under the lead; fall through and re-create.
  }

  const [project] = await db
    .insert(projects)
    .values({
      userId: ctx.userId,
      name: lead.companyName,
      slug: await uniqueProjectSlug(ctx.userId, lead.companyName),
      category: "business",
      state: "prospect",
    })
    .returning();
  if (!project) throw new Error("Failed to create the prospect project.");
  await syncProjectRow(project.id, "insert", project);

  const [updated] = await db
    .update(leads)
    .set({ projectId: project.id, updatedAt: new Date() })
    .where(and(eq(leads.id, lead.id), eq(leads.userId, ctx.userId)))
    .returning();
  if (updated) await syncLeadRow(updated.id, "update", updated);

  return { projectId: project.id, created: true };
}

/**
 * Signing closes the sourcing→money loop: the prospect becomes active work, and it
 * gets a client so rates, time and invoicing (W1/W4/W16) have something to hang on.
 *
 * An existing client of the same name is reused rather than duplicated — the usual
 * case is a company already in the book. Nothing here writes money: the client's
 * rate is a separate, financial-class decision the user makes on Money.
 */
export async function signProject(
  ctx: Ctx,
  projectId: string,
  companyName: string
): Promise<{ clientId: string }> {
  const key = companyName.trim().toLowerCase();
  const existingClients = await db
    .select({ id: clients.id, name: clients.name, archivedAt: clients.archivedAt })
    .from(clients)
    .where(eq(clients.userId, ctx.userId));
  const match = existingClients.find((c) => c.name.trim().toLowerCase() === key);

  let clientId: string;
  if (match) {
    clientId = match.id;
    // Signing with an archived client un-archives it — they're a client again.
    if (match.archivedAt) {
      const [revived] = await db
        .update(clients)
        .set({ archivedAt: null, status: "active", updatedAt: new Date() })
        .where(and(eq(clients.id, match.id), eq(clients.userId, ctx.userId)))
        .returning();
      if (revived) await syncClientRow(revived.id, "update", revived);
    }
  } else {
    const [created] = await db
      .insert(clients)
      .values({ userId: ctx.userId, orgId: ctx.orgId, name: companyName.trim() })
      .returning();
    if (!created) throw new Error("Failed to create the client.");
    await syncClientRow(created.id, "insert", created);
    clientId = created.id;
  }

  const [project] = await db
    .update(projects)
    .set({ state: "active", clientId, archivedAt: null, updatedAt: new Date() })
    .where(and(eq(projects.id, projectId), eq(projects.userId, ctx.userId)))
    .returning();
  if (project) await syncProjectRow(project.id, "update", project);

  return { clientId };
}

/**
 * Reopening a signed deal. The project goes back to being a prospect and un-links
 * from the client — but the client row itself survives untouched. Deleting it would
 * be destructive well beyond what "I moved a card back" asks for, and it may
 * already carry rates or invoices.
 */
export async function unsignProject(ctx: Ctx, projectId: string): Promise<void> {
  const [project] = await db
    .update(projects)
    .set({ state: "prospect", clientId: null, updatedAt: new Date() })
    .where(and(eq(projects.id, projectId), eq(projects.userId, ctx.userId)))
    .returning();
  if (project) await syncProjectRow(project.id, "update", project);
}

/**
 * A declined or lost deal leaves the board. The project is archived, not deleted —
 * the outreach, the notes and the score stay readable as evidence for the Filter,
 * and a deal that comes back to life reopens into the same row.
 */
export async function archiveProject(ctx: Ctx, projectId: string): Promise<void> {
  const now = new Date();
  const [project] = await db
    .update(projects)
    .set({ archivedAt: now, updatedAt: now })
    .where(and(eq(projects.id, projectId), eq(projects.userId, ctx.userId)))
    .returning();
  if (project) await syncProjectRow(project.id, "update", project);
}

export async function unarchiveProject(ctx: Ctx, projectId: string): Promise<void> {
  const [project] = await db
    .update(projects)
    .set({ archivedAt: null, updatedAt: new Date() })
    .where(and(eq(projects.id, projectId), eq(projects.userId, ctx.userId)))
    .returning();
  if (project) await syncProjectRow(project.id, "update", project);
}

/** The lead a prospect project came from, if any — the Sweep's "is this a deal?" read. */
export async function findLeadForProject(
  userId: string,
  projectId: string
): Promise<{ id: string; companyName: string; state: string } | null> {
  const [lead] = await db
    .select({ id: leads.id, companyName: leads.companyName, state: leads.state })
    .from(leads)
    .where(and(eq(leads.userId, userId), eq(leads.projectId, projectId), isNull(leads.closedAt)))
    .limit(1);
  return lead ?? null;
}

import { randomUUID } from "node:crypto";

import { createSqliteDb } from "@kash/db-local";
import { clients, invoices, projects, timeEntries } from "@kash/db-local/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

/**
 * The W4 double-bill guard, proven at the DB layer. `invoices.accept` stamps
 * `invoice_id` on the billed entries with `... WHERE invoice_id IS NULL`; an entry
 * that already carries an invoice id is untouched. This test replays exactly that
 * conditional UPDATE twice and asserts the second one stamps nothing — so the same
 * time can never be billed onto two invoices.
 */
describe("invoice double-bill guard (sqlite)", () => {
  const userId = randomUUID();
  const clientId = randomUUID();
  const projectId = randomUUID();
  const entryIds = [randomUUID(), randomUUID()];
  let db: ReturnType<typeof createSqliteDb>["db"];

  beforeEach(() => {
    const sqlite = createSqliteDb(":memory:");
    db = sqlite.db;
    const now = new Date();

    db.insert(clients)
      .values({
        id: clientId,
        userId,
        orgId: userId,
        name: "Great White",
        createdAt: now,
        updatedAt: now,
      })
      .run();
    db.insert(projects)
      .values({
        id: projectId,
        userId,
        name: "Engagement",
        slug: "engagement",
        category: "business",
        clientId,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    for (const id of entryIds) {
      db.insert(timeEntries)
        .values({
          id,
          userId,
          projectId,
          startedAt: new Date(now.getTime() - 3600_000),
          endedAt: now,
          billable: true,
          source: "manual",
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }
  });

  function stamp(invoiceId: string): string[] {
    const now = new Date();
    return db
      .update(timeEntries)
      .set({ invoiceId, invoicedAt: now, updatedAt: now })
      .where(
        and(
          eq(timeEntries.userId, userId),
          inArray(timeEntries.id, entryIds),
          isNull(timeEntries.invoiceId)
        )
      )
      .returning({ id: timeEntries.id })
      .all()
      .map((r) => r.id);
  }

  /** Insert one accepted invoice row and return its id. */
  function makeInvoice(): string {
    const now = new Date();
    const id = randomUUID();
    db.insert(invoices)
      .values({
        id,
        userId,
        orgId: userId,
        clientId,
        invoiceNumber: 1,
        periodStart: now,
        periodEnd: now,
        thresholdHours: 20,
        rateCents: 4500,
        billedSeconds: 3600,
        amountCents: 4500,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    return id;
  }

  /** Bare reassignment with NO `invoice_id IS NULL` guard — the convention removed. */
  function reassign(entryId: string, invoiceId: string): void {
    db.update(timeEntries)
      .set({ invoiceId, invoicedAt: new Date(), updatedAt: new Date() })
      .where(eq(timeEntries.id, entryId))
      .run();
  }

  it("stamps unbilled entries once and never a second time", () => {
    const now = new Date();
    const firstInvoice = randomUUID();
    const secondInvoice = randomUUID();
    for (const id of [firstInvoice, secondInvoice]) {
      db.insert(invoices)
        .values({
          id,
          userId,
          orgId: userId,
          clientId,
          invoiceNumber: 1,
          periodStart: now,
          periodEnd: now,
          thresholdHours: 20,
          rateCents: 4500,
          billedSeconds: 3600,
          amountCents: 4500,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }

    // First acceptance bills both entries.
    expect(stamp(firstInvoice)).toHaveLength(2);

    // A second acceptance of the same entries stamps nothing — the guard holds.
    expect(stamp(secondInvoice)).toHaveLength(0);

    const rows = db
      .select({ id: timeEntries.id, invoiceId: timeEntries.invoiceId })
      .from(timeEntries)
      .all();
    expect(rows.every((r) => r.invoiceId === firstInvoice)).toBe(true);
  });

  // The conditional UPDATE is the app-layer guard; the DB-level guard is a
  // write-once trigger on `invoice_id`. These tests bypass the `IS NULL`
  // convention entirely and assert the trigger itself is the backstop.
  it("rejects re-pointing a billed entry at a different invoice (DB trigger)", () => {
    const first = makeInvoice();
    const second = makeInvoice();
    const [entryId] = entryIds;

    // First bill: NULL -> invoice is allowed.
    reassign(entryId, first);

    // Re-bill onto a different invoice with no IS-NULL guard: the trigger aborts.
    expect(() => reassign(entryId, second)).toThrow(/immutable once set/);

    // The entry is untouched — still on the first invoice.
    const [row] = db
      .select({ invoiceId: timeEntries.invoiceId })
      .from(timeEntries)
      .where(eq(timeEntries.id, entryId))
      .all();
    expect(row.invoiceId).toBe(first);
  });

  it("still allows void (invoice -> NULL) and re-billing the freed entry", () => {
    const first = makeInvoice();
    const second = makeInvoice();
    const [entryId] = entryIds;

    reassign(entryId, first);

    // Void releases the entry: invoice -> NULL is allowed.
    db.update(timeEntries)
      .set({ invoiceId: null, invoicedAt: null, updatedAt: new Date() })
      .where(eq(timeEntries.id, entryId))
      .run();

    // Now free, it can be billed onto a new invoice: NULL -> invoice is allowed.
    expect(() => reassign(entryId, second)).not.toThrow();

    const [row] = db
      .select({ invoiceId: timeEntries.invoiceId })
      .from(timeEntries)
      .where(eq(timeEntries.id, entryId))
      .all();
    expect(row.invoiceId).toBe(second);
  });
});

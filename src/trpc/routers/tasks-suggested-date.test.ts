import { randomUUID } from "node:crypto";

import { createSqliteDb } from "@kash/db-local";
import { tasks } from "@kash/db-local/schema";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { addDays, datesInIsoWeek, isDateInIsoWeek, toISODateString } from "@/lib/dates/local-day";
import { partitionWeekTasks } from "@/lib/week/partition-week-tasks";

// ---------------------------------------------------------------------------
// The tasks router's `db` isn't injectable, so — like care.test.ts /
// task-bulk-imports.test.ts — these replicate the `acceptSuggestedDate` and
// `scheduleToDate` mutation logic against the sqlite mirror (which carries the
// new suggested_scheduled_date column) and assert against the *real* week
// partition + date helpers. This proves the suggestion-clearing contract holds.
// ---------------------------------------------------------------------------

// A fixed Wednesday so in-week / out-of-week dates are deterministic.
const REF = new Date(2026, 6, 8);
const WEEK = datesInIsoWeek(REF).map(toISODateString);
const IN_WEEK = WEEK[4]!; // Friday of the reference week
const OUT_OF_WEEK = toISODateString(addDays(REF, 30));

describe("suggested-date inbox commit (sqlite)", () => {
  const userId = randomUUID();
  let db: ReturnType<typeof createSqliteDb>["db"];

  beforeEach(() => {
    db = createSqliteDb(":memory:").db;
  });

  /** Insert an unscheduled chat inbox task carrying a suggested day. */
  function seedInboxTask(suggestedScheduledDate: string | null) {
    const now = new Date();
    return db
      .insert(tasks)
      .values({
        id: randomUUID(),
        userId,
        title: "Ship the deck",
        category: "adulting",
        scheduledDate: null,
        bucketOverride: "later",
        suggestedScheduledDate,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
  }

  /** Replicates tasksRouter.acceptSuggestedDate — deliberately NO ISO-week guard. */
  function acceptSuggestedDate(id: string) {
    const task = db.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!task) throw new Error("NOT_FOUND");
    if (task.suggestedScheduledDate === null) {
      throw new Error("BAD_REQUEST: no suggested date to accept");
    }
    return db
      .update(tasks)
      .set({
        scheduledDate: task.suggestedScheduledDate,
        bucketOverride: null,
        suggestedScheduledDate: null,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning()
      .get();
  }

  /** Replicates tasksRouter.scheduleToDate — guard + suggestion clear on commit. */
  function scheduleToDate(id: string, scheduledDate: string | null, ref: Date) {
    if (scheduledDate !== null && !isDateInIsoWeek(scheduledDate, ref)) {
      throw new Error("BAD_REQUEST: scheduledDate must be within the current calendar week.");
    }
    const patch: Partial<typeof tasks.$inferInsert> = {
      scheduledDate,
      updatedAt: new Date(),
    };
    if (scheduledDate !== null) {
      patch.bucketOverride = null;
      patch.suggestedScheduledDate = null;
    }
    return db.update(tasks).set(patch).where(eq(tasks.id, id)).returning().get();
  }

  it("commits the suggested date and clears both the suggestion and bucketOverride", () => {
    const seeded = seedInboxTask(IN_WEEK);
    // Before Accept it lives in the inbox rail (keyed only on null scheduledDate).
    expect(partitionWeekTasks([seeded], REF).inbox).toHaveLength(1);

    const row = acceptSuggestedDate(seeded.id);

    expect(row.scheduledDate).toBe(IN_WEEK);
    expect(row.bucketOverride).toBeNull();
    expect(row.suggestedScheduledDate).toBeNull();

    // Now it partitions onto its weekday, out of the inbox.
    const part = partitionWeekTasks([row], REF);
    expect(part.inbox).toHaveLength(0);
    expect(part.byDate[IN_WEEK]).toHaveLength(1);
  });

  it("accepts an out-of-week suggestion without throwing (lands in Later, no guard)", () => {
    const seeded = seedInboxTask(OUT_OF_WEEK);

    // The scheduleToDate guard would reject this date...
    expect(() => scheduleToDate(seeded.id, OUT_OF_WEEK, REF)).toThrow(/current calendar week/);

    // ...but Accept has no guard and commits it into the Later backlog.
    const row = acceptSuggestedDate(seeded.id);
    expect(row.scheduledDate).toBe(OUT_OF_WEEK);
    expect(row.suggestedScheduledDate).toBeNull();
    expect(row.bucketOverride).toBeNull();

    const part = partitionWeekTasks([row], REF);
    expect(part.inbox).toHaveLength(0);
    expect(part.byDate[OUT_OF_WEEK]).toBeUndefined();
    expect(part.later).toHaveLength(1);
  });

  it("throws when there is no suggested date to accept", () => {
    const seeded = seedInboxTask(null);
    expect(() => acceptSuggestedDate(seeded.id)).toThrow(/no suggested date/);
  });

  it("scheduleToDate clears the suggestion when a weekday is committed (drag path)", () => {
    const seeded = seedInboxTask(IN_WEEK);

    const row = scheduleToDate(seeded.id, IN_WEEK, REF);

    expect(row.scheduledDate).toBe(IN_WEEK);
    expect(row.bucketOverride).toBeNull();
    expect(row.suggestedScheduledDate).toBeNull();
  });

  it("scheduleToDate back to the inbox (null) leaves the suggestion intact", () => {
    const seeded = seedInboxTask(IN_WEEK);

    const row = scheduleToDate(seeded.id, null, REF);

    expect(row.scheduledDate).toBeNull();
    // Dropping into the inbox must not resolve the pending suggestion.
    expect(row.suggestedScheduledDate).toBe(IN_WEEK);
  });
});

describe("manual inbox create with suggested date (sqlite)", () => {
  const userId = randomUUID();
  let db: ReturnType<typeof createSqliteDb>["db"];

  beforeEach(() => {
    db = createSqliteDb(":memory:").db;
  });

  /** Replicates tasksRouter.create inbox landing from QuickInput createInInbox. */
  function createInboxTask(suggestedScheduledDate: string) {
    const now = new Date();
    return db
      .insert(tasks)
      .values({
        id: randomUUID(),
        userId,
        title: "Pay water bill",
        category: "adulting",
        scheduledDate: null,
        bucketOverride: "later",
        suggestedScheduledDate,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
  }

  it("lands in the Week inbox with suggestion intact", () => {
    const row = createInboxTask(IN_WEEK);

    expect(row.scheduledDate).toBeNull();
    expect(row.bucketOverride).toBe("later");
    expect(row.suggestedScheduledDate).toBe(IN_WEEK);

    const part = partitionWeekTasks([row], REF);
    expect(part.inbox).toHaveLength(1);
    expect(part.byDate[IN_WEEK] ?? []).toHaveLength(0);
  });
});

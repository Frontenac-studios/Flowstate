import { randomUUID } from "node:crypto";

import { createSqliteDb } from "@kash/db-local";
import { careActivities, careEvents, taskRecurrence, tasks } from "@kash/db-local/schema";
import { and, desc, eq, gte, isNull } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { cadenceToRRule } from "@/lib/care/cadence";
import { isCatalogKey } from "@/lib/care/catalog";
import { CARE_CADENCES, CARE_KINDS, CARE_THEMES } from "@/lib/care/types";

// ---------------------------------------------------------------------------
// Zod input schemas — re-declared to match src/trpc/routers/care.ts (the router's
// schemas aren't exported), mirroring the task-bulk-imports.test.ts pattern.
// ---------------------------------------------------------------------------

const adoptInput = z.object({ key: z.string().refine(isCatalogKey, "Unknown catalog key.") });

const createCustomInput = z.object({
  title: z.string().trim().min(1).max(200),
  theme: z.enum(CARE_THEMES),
  cadence: z.enum(CARE_CADENCES).optional(),
  kind: z.enum(CARE_KINDS).optional(),
  note: z.string().trim().max(2000).optional(),
});

const updateActivityInput = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(200).optional(),
  theme: z.enum(CARE_THEMES).optional(),
  cadence: z.enum(CARE_CADENCES).nullable().optional(),
  kind: z.enum(CARE_KINDS).nullable().optional(),
  note: z.string().trim().max(2000).nullable().optional(),
});

const activityIdInput = z.object({ activityId: z.string().uuid() });

describe("care Zod input schemas", () => {
  it("adopt accepts a real catalog key, rejects junk", () => {
    expect(adoptInput.safeParse({ key: "move_walk_10" }).success).toBe(true);
    expect(adoptInput.safeParse({ key: "not_real" }).success).toBe(false);
    expect(adoptInput.safeParse({ key: "" }).success).toBe(false);
  });

  it("createCustom requires title + theme and validates enums", () => {
    expect(createCustomInput.safeParse({ title: "Tea break", theme: "calm" }).success).toBe(true);
    expect(
      createCustomInput.safeParse({
        title: "Walk",
        theme: "move",
        cadence: "daily",
        kind: "walk",
        note: "gentle",
      }).success
    ).toBe(true);
    // missing theme
    expect(createCustomInput.safeParse({ title: "No theme" }).success).toBe(false);
    // empty / whitespace-only title
    expect(createCustomInput.safeParse({ title: "   ", theme: "calm" }).success).toBe(false);
    // invalid enum members
    expect(createCustomInput.safeParse({ title: "x", theme: "sleep" }).success).toBe(false);
    expect(
      createCustomInput.safeParse({ title: "x", theme: "calm", cadence: "hourly" }).success
    ).toBe(false);
  });

  it("createCustom rejects an over-long title", () => {
    expect(createCustomInput.safeParse({ title: "a".repeat(201), theme: "calm" }).success).toBe(
      false
    );
  });

  it("updateActivity allows clearing nullable fields but not title", () => {
    const id = randomUUID();
    expect(
      updateActivityInput.safeParse({ id, cadence: null, note: null, kind: null }).success
    ).toBe(true);
    expect(updateActivityInput.safeParse({ id, title: "Renamed" }).success).toBe(true);
    // title cannot be nulled (required field)
    expect(updateActivityInput.safeParse({ id, title: null }).success).toBe(false);
    // id must be a uuid
    expect(updateActivityInput.safeParse({ id: "nope", title: "x" }).success).toBe(false);
  });

  it("logEvent / addToMyDay require a uuid activityId", () => {
    expect(activityIdInput.safeParse({ activityId: randomUUID() }).success).toBe(true);
    expect(activityIdInput.safeParse({ activityId: "123" }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DB-backed behavior against the sqlite mirror (it carries the care tables).
// The router's `db` isn't injectable, so — like task-bulk-imports.test.ts — these
// replicate the procedures' query logic to prove the shapes hold on real schema.
// ---------------------------------------------------------------------------

describe("care persistence (sqlite)", () => {
  const userId = randomUUID();
  let db: ReturnType<typeof createSqliteDb>["db"];

  beforeEach(() => {
    db = createSqliteDb(":memory:").db;
  });

  /** Replicates careRouter.adopt: select-or-insert by (user, catalogKey, active). */
  function adopt(key: string) {
    const existing = db
      .select()
      .from(careActivities)
      .where(
        and(
          eq(careActivities.userId, userId),
          eq(careActivities.catalogKey, key),
          isNull(careActivities.archivedAt)
        )
      )
      .limit(1)
      .all();

    if (existing.length > 0) return existing[0]!;

    const now = new Date();
    return db
      .insert(careActivities)
      .values({
        id: randomUUID(),
        userId,
        title: "10-minute walk",
        theme: "move",
        kind: "walk",
        cadence: "most_days",
        source: "suggested",
        catalogKey: key,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
  }

  it("adopt is idempotent for a still-held key", () => {
    const first = adopt("move_walk_10");
    const second = adopt("move_walk_10");

    expect(second.id).toBe(first.id);

    const rows = db
      .select()
      .from(careActivities)
      .where(eq(careActivities.catalogKey, "move_walk_10"))
      .all();
    expect(rows).toHaveLength(1);
  });

  it("re-adopting after archive creates a fresh row (catalog shows it again)", () => {
    const first = adopt("move_walk_10");
    db.update(careActivities)
      .set({ archivedAt: new Date() })
      .where(eq(careActivities.id, first.id))
      .run();

    const second = adopt("move_walk_10");
    expect(second.id).not.toBe(first.id);

    const active = db
      .select()
      .from(careActivities)
      .where(and(eq(careActivities.catalogKey, "move_walk_10"), isNull(careActivities.archivedAt)))
      .all();
    expect(active).toHaveLength(1);
  });

  it("addToMyDay spawns a body_mind task with the join + a recurrence row when cadence is set", () => {
    const now = new Date();
    const activity = db
      .insert(careActivities)
      .values({
        id: randomUUID(),
        userId,
        title: "10-minute walk",
        theme: "move",
        cadence: "daily",
        source: "suggested",
        catalogKey: "move_walk_10",
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    const rrule = cadenceToRRule(activity.cadence);
    expect(rrule).toBe("FREQ=DAILY");

    const task = db
      .insert(tasks)
      .values({
        id: randomUUID(),
        userId,
        title: activity.title,
        category: "body_mind",
        careActivityId: activity.id,
        scheduledDate: rrule ? null : "2026-06-29",
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    expect(task.category).toBe("body_mind");
    expect(task.careActivityId).toBe(activity.id);
    expect(task.scheduledDate).toBeNull();

    db.insert(taskRecurrence)
      .values({
        id: randomUUID(),
        userId,
        taskId: task.id,
        rrule: rrule!,
        startDate: "2026-06-29",
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const recurrence = db
      .select()
      .from(taskRecurrence)
      .where(eq(taskRecurrence.taskId, task.id))
      .all();
    expect(recurrence).toHaveLength(1);
    expect(recurrence[0]!.rrule).toBe("FREQ=DAILY");
  });

  it("addToMyDay skips recurrence and schedules today for a cadence-less practice", () => {
    const now = new Date();
    const activity = db
      .insert(careActivities)
      .values({
        id: randomUUID(),
        userId,
        title: "Drink a glass of water",
        theme: "nourish",
        source: "suggested",
        catalogKey: "nourish_water",
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    const rrule = cadenceToRRule(activity.cadence);
    expect(rrule).toBeNull();

    const task = db
      .insert(tasks)
      .values({
        id: randomUUID(),
        userId,
        title: activity.title,
        category: "body_mind",
        careActivityId: activity.id,
        scheduledDate: rrule ? null : "2026-06-29",
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    expect(task.scheduledDate).toBe("2026-06-29");
    const recurrence = db
      .select()
      .from(taskRecurrence)
      .where(eq(taskRecurrence.taskId, task.id))
      .all();
    expect(recurrence).toHaveLength(0);
  });

  it("logEvent + recentEvents surfaces today's check-offs", () => {
    const now = new Date();
    const activity = db
      .insert(careActivities)
      .values({
        id: randomUUID(),
        userId,
        title: "Stretch for 5 minutes",
        theme: "move",
        source: "custom",
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    db.insert(careEvents)
      .values({
        id: randomUUID(),
        userId,
        activityId: activity.id,
        occurredAt: now,
        createdAt: now,
      })
      .run();

    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    const todays = db
      .select({ activityId: careEvents.activityId, occurredAt: careEvents.occurredAt })
      .from(careEvents)
      .where(and(eq(careEvents.userId, userId), gte(careEvents.occurredAt, dayStart)))
      .orderBy(desc(careEvents.occurredAt))
      .all();

    expect(todays).toHaveLength(1);
    expect(todays[0]!.activityId).toBe(activity.id);
  });
});

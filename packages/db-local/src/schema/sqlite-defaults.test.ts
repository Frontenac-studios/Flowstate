import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { createSqliteDb, type SqliteDb } from "../index";
import { businessExpenses } from "./business-expenses";
import { clients } from "./clients";
import { moneySettings } from "./money-settings";
import { phases } from "./phases";
import { projects } from "./projects";
import { rates } from "./rates";
import { timeEntries } from "./time-entries";
import { timeTags } from "./time-tags";

// Regression: the SQLite schema must mirror the Postgres `defaultRandom()` /
// `defaultNow()` defaults so that inserts which omit `id`/`created_at`/`updated_at`
// (as every tRPC router insert does) succeed offline. Missing these defaults
// previously surfaced as "Couldn't create the project" in the desktop app —
// SQLite threw `NOT NULL constraint failed: projects.id`.

describe("sqlite schema insert-time defaults", () => {
  let db: SqliteDb;

  beforeEach(() => {
    db = createSqliteDb(":memory:").db;
  });

  it("creates a project without an explicit id or timestamps", async () => {
    const [row] = await db
      .insert(projects)
      .values({
        userId: "11111111-1111-1111-1111-111111111111",
        name: "Frontenac Studios Launch",
        slug: "frontenac-studios-launch",
        category: "business",
      })
      .returning();

    expect(row).toBeDefined();
    expect(typeof row!.id).toBe("string");
    expect(row!.id.length).toBeGreaterThan(0);
    expect(row!.createdAt).toBeInstanceOf(Date);
    expect(row!.updatedAt).toBeInstanceOf(Date);
  });

  it("creates a sibling row (phases) without an explicit id or timestamps", async () => {
    const userId = "11111111-1111-1111-1111-111111111111";
    const [project] = await db
      .insert(projects)
      .values({ userId, name: "P", slug: "p", category: "personal" })
      .returning();

    const [phase] = await db
      .insert(phases)
      .values({ userId, projectId: project!.id, name: "Phase 1" })
      .returning();

    expect(phase).toBeDefined();
    expect(typeof phase!.id).toBe("string");
    expect(phase!.id.length).toBeGreaterThan(0);
    expect(phase!.createdAt).toBeInstanceOf(Date);
    expect(phase!.updatedAt).toBeInstanceOf(Date);

    const [fetched] = await db.select().from(phases).where(eq(phases.id, phase!.id));
    expect(fetched!.projectId).toBe(project!.id);
  });

  it("creates a project with is_maintenance/state defaults from the mirror", async () => {
    const [row] = await db
      .insert(projects)
      .values({
        userId: "11111111-1111-1111-1111-111111111111",
        name: "P",
        slug: "p",
        category: "business",
      })
      .returning();

    expect(row).toBeDefined();
    expect(row!.state).toBe("active");
    expect(row!.isMaintenance).toBe(false);
    expect(row!.clientId).toBeNull();
  });

  it("creates a client without explicit id/timestamps/currency/status", async () => {
    const [row] = await db
      .insert(clients)
      .values({
        userId: "11111111-1111-1111-1111-111111111111",
        orgId: "22222222-2222-2222-2222-222222222222",
        name: "Great White",
      })
      .returning();

    expect(row).toBeDefined();
    expect(typeof row!.id).toBe("string");
    expect(row!.currency).toBe("USD");
    expect(row!.status).toBe("active");
    expect(row!.createdAt).toBeInstanceOf(Date);
  });

  it("creates a rate row with default effectiveFrom/timestamps", async () => {
    const userId = "11111111-1111-1111-1111-111111111111";
    const orgId = "22222222-2222-2222-2222-222222222222";
    const [client] = await db
      .insert(clients)
      .values({ userId, orgId, name: "Great White" })
      .returning();

    const [row] = await db
      .insert(rates)
      .values({
        userId,
        orgId,
        clientId: client!.id,
        amountCents: 15000,
      })
      .returning();

    expect(row).toBeDefined();
    expect(row!.amountCents).toBe(15000);
    expect(row!.projectId).toBeNull();
    expect(row!.effectiveFrom).toBeInstanceOf(Date);
  });

  it("creates a business expense without explicit id/source/timestamps", async () => {
    const [row] = await db
      .insert(businessExpenses)
      .values({
        userId: "11111111-1111-1111-1111-111111111111",
        orgId: "22222222-2222-2222-2222-222222222222",
        amountCents: 4200,
        incurredOn: new Date("2026-08-01"),
      })
      .returning();

    expect(row).toBeDefined();
    expect(typeof row!.id).toBe("string");
    expect(row!.source).toBe("manual");
    expect(row!.category).toBeNull();
    expect(row!.createdAt).toBeInstanceOf(Date);
    expect(row!.updatedAt).toBeInstanceOf(Date);
  });

  it("creates a money_settings row (user-keyed) without explicit timestamps", async () => {
    const [row] = await db
      .insert(moneySettings)
      .values({
        userId: "11111111-1111-1111-1111-111111111111",
        orgId: "22222222-2222-2222-2222-222222222222",
      })
      .returning();

    expect(row).toBeDefined();
    expect(row!.taxReservePercent).toBeNull();
    expect(row!.costOfLivingCents).toBeNull();
    expect(row!.createdAt).toBeInstanceOf(Date);
    expect(row!.updatedAt).toBeInstanceOf(Date);
  });

  it("creates a time entry without explicit id/billable/source/timestamps", async () => {
    const userId = "11111111-1111-1111-1111-111111111111";
    const [project] = await db
      .insert(projects)
      .values({ userId, name: "P", slug: "p", category: "business" })
      .returning();

    const [row] = await db
      .insert(timeEntries)
      .values({ userId, projectId: project!.id, startedAt: new Date() })
      .returning();

    expect(row).toBeDefined();
    expect(typeof row!.id).toBe("string");
    expect(row!.taskId).toBeNull();
    expect(row!.billable).toBe(false);
    expect(row!.source).toBe("manual");
    expect(row!.createdAt).toBeInstanceOf(Date);
    expect(row!.updatedAt).toBeInstanceOf(Date);
  });

  it("creates a time tag without an explicit id or timestamps", async () => {
    const [row] = await db
      .insert(timeTags)
      .values({
        userId: "11111111-1111-1111-1111-111111111111",
        orgId: "22222222-2222-2222-2222-222222222222",
        name: "Development",
      })
      .returning();

    expect(row).toBeDefined();
    expect(typeof row!.id).toBe("string");
    expect(row!.createdAt).toBeInstanceOf(Date);
  });
});

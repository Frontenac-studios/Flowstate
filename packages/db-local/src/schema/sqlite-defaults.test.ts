import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { createSqliteDb, type SqliteDb } from "../index";
import { businessExpenses } from "./business-expenses";
import { careEvents } from "./care-events";
import { clients } from "./clients";
import { directions } from "./directions";
import { ledgerPeriods } from "./ledger-periods";
import { leads } from "./leads";
import { leadOutreach } from "./lead-outreach";
import { moneySettings } from "./money-settings";
import { phases } from "./phases";
import { projectFees } from "./project-fees";
import { projects } from "./projects";
import { rates } from "./rates";
import { targets } from "./targets";
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

  it("creates a direction without explicit id/active/timestamps (W5)", async () => {
    const [row] = await db
      .insert(directions)
      .values({
        userId: "11111111-1111-1111-1111-111111111111",
        orgId: "22222222-2222-2222-2222-222222222222",
        statement: "We serve early-stage teams shipping production software.",
      })
      .returning();

    expect(row).toBeDefined();
    expect(typeof row!.id).toBe("string");
    expect(row!.active).toBe(true);
    expect(row!.retiredAt).toBeNull();
    expect(row!.createdAt).toBeInstanceOf(Date);
    expect(row!.updatedAt).toBeInstanceOf(Date);
  });

  it("creates a target with horizon/source/state defaults from the mirror (W5)", async () => {
    const userId = "11111111-1111-1111-1111-111111111111";
    const orgId = "22222222-2222-2222-2222-222222222222";
    const [direction] = await db
      .insert(directions)
      .values({ userId, orgId, statement: "Ship production software." })
      .returning();

    const [row] = await db
      .insert(targets)
      .values({
        userId,
        orgId,
        directionId: direction!.id,
        title: "$40k booked this quarter",
        periodStart: new Date("2026-07-01"),
        periodEnd: new Date("2026-09-30"),
        measureKind: "currency",
        measureTarget: 4_000_000,
      })
      .returning();

    expect(row).toBeDefined();
    expect(typeof row!.id).toBe("string");
    expect(row!.horizon).toBe("quarter");
    expect(row!.measureSource).toBe("manual");
    expect(row!.state).toBe("active");
    expect(row!.measureCurrent).toBeNull();
    expect(row!.derivationKey).toBeNull();
    expect(row!.createdAt).toBeInstanceOf(Date);
    expect(row!.updatedAt).toBeInstanceOf(Date);
  });

  it("creates a lead with source/state defaults from the mirror (W10)", async () => {
    const [row] = await db
      .insert(leads)
      .values({
        userId: "11111111-1111-1111-1111-111111111111",
        orgId: "22222222-2222-2222-2222-222222222222",
        companyName: "Acme Robotics",
      })
      .returning();

    expect(row).toBeDefined();
    expect(typeof row!.id).toBe("string");
    expect(row!.source).toBe("manual");
    expect(row!.state).toBe("new");
    expect(row!.score).toBeNull();
    expect(row!.confidence).toBeNull();
    expect(row!.rationale).toBeNull();
    expect(row!.createdAt).toBeInstanceOf(Date);
  });

  it("creates a lead outreach draft with status/sort defaults (W10)", async () => {
    const userId = "11111111-1111-1111-1111-111111111111";
    const orgId = "22222222-2222-2222-2222-222222222222";
    const [lead] = await db
      .insert(leads)
      .values({ userId, orgId, companyName: "Acme Robotics" })
      .returning();

    const [row] = await db
      .insert(leadOutreach)
      .values({ userId, orgId, leadId: lead!.id, kind: "opener", body: "Hi there —" })
      .returning();

    expect(row).toBeDefined();
    expect(typeof row!.id).toBe("string");
    expect(row!.status).toBe("draft");
    expect(row!.sortOrder).toBe(0);
    expect(row!.sentAt).toBeNull();
    expect(row!.createdAt).toBeInstanceOf(Date);
  });

  it("seals a ledger fortnight without an explicit id or timestamps", async () => {
    // The seal path inserts a jsonb breakdown; a plain-text mirror column would
    // fail to bind the object (see the desktop jsonb bind gotcha).
    const [row] = await db
      .insert(ledgerPeriods)
      .values({
        userId: "11111111-1111-1111-1111-111111111111",
        periodStart: "2026-08-14",
        tiltBusinessPct: 70,
        businessSeconds: 147_600,
        personalSeconds: 212_400,
        breakdown: [
          {
            kind: "client",
            clientId: "22222222-2222-2222-2222-222222222222",
            name: "Great White",
            seconds: 93_600,
            sharePct: 26,
            projects: [
              {
                projectId: "33333333-3333-3333-3333-333333333333",
                name: "GW — Build",
                seconds: 72_000,
                sharePct: 20,
              },
            ],
          },
        ],
      })
      .returning();

    expect(row).toBeDefined();
    expect(typeof row!.id).toBe("string");
    expect(row!.sealedAt).toBeInstanceOf(Date);
    expect(row!.createdAt).toBeInstanceOf(Date);
    expect((row!.breakdown as { name: string }[])[0]!.name).toBe("Great White");
  });

  it("logs a care event without an explicit occurredAt (semantic timestamp default)", async () => {
    const [row] = await db
      .insert(careEvents)
      .values({ userId: "11111111-1111-1111-1111-111111111111" })
      .returning();

    expect(row).toBeDefined();
    expect(typeof row!.id).toBe("string");
    expect(row!.occurredAt).toBeInstanceOf(Date);
    expect(row!.createdAt).toBeInstanceOf(Date);
  });

  it("creates a project fee without an explicit id or timestamps", async () => {
    const [row] = await db
      .insert(projectFees)
      .values({
        userId: "11111111-1111-1111-1111-111111111111",
        orgId: "22222222-2222-2222-2222-222222222222",
        projectId: "33333333-3333-3333-3333-333333333333",
        proposalAmountCents: 4_000_000,
      })
      .returning();

    expect(row).toBeDefined();
    expect(typeof row!.id).toBe("string");
    expect(row!.proposalAmountCents).toBe(4_000_000);
    expect(row!.createdAt).toBeInstanceOf(Date);
    expect(row!.updatedAt).toBeInstanceOf(Date);
  });
});

import { randomUUID } from "node:crypto";

import { createSqliteDb } from "@kash/db-local";
import { clients, ledgerPeriods, projects, timeEntries } from "@kash/db-local/schema";
import { and, eq, gte, lt } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { computeLedger } from "@/lib/ledger/compute-ledger";
import { periodForKey } from "@/lib/ledger/fortnight";

// ---------------------------------------------------------------------------
// Zod input schemas — re-declared to match src/trpc/routers/ledger.ts (the
// router's schemas aren't exported), mirroring the care.test.ts pattern.
// ---------------------------------------------------------------------------

const tzOffsetSchema = z.number().int().min(-840).max(840);
const periodKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const forPeriodInput = z.object({
  periodKey: periodKeySchema.optional(),
  tzOffsetMinutes: tzOffsetSchema,
});

describe("ledger Zod input schemas", () => {
  it("accepts a bare tz offset (the default, last-closed read)", () => {
    expect(forPeriodInput.safeParse({ tzOffsetMinutes: -300 }).success).toBe(true);
  });

  it("rejects a malformed period key", () => {
    expect(forPeriodInput.safeParse({ periodKey: "14 Aug", tzOffsetMinutes: 0 }).success).toBe(
      false
    );
    expect(forPeriodInput.safeParse({ periodKey: "2026-8-14", tzOffsetMinutes: 0 }).success).toBe(
      false
    );
  });

  it("rejects a tz offset outside the real range", () => {
    expect(forPeriodInput.safeParse({ tzOffsetMinutes: 900 }).success).toBe(false);
    expect(forPeriodInput.safeParse({ tzOffsetMinutes: 1.5 }).success).toBe(false);
  });
});

describe("ledger reads over the time log", () => {
  const userId = "11111111-1111-1111-1111-111111111111";
  const orgId = "22222222-2222-2222-2222-222222222222";
  const UTC = 0;
  // 14–27 Aug 2026, closing Fri 28 Aug.
  const period = periodForKey("2026-08-14", UTC)!;

  let db: ReturnType<typeof createSqliteDb>["db"];

  const addProject = async (name: string, category: "business" | "personal", clientId?: string) => {
    const [row] = await db
      .insert(projects)
      .values({
        id: randomUUID(),
        userId,
        name,
        slug: name.toLowerCase().replace(/\W+/g, "-"),
        category,
        clientId: clientId ?? null,
      })
      .returning();
    return row!;
  };

  const logHours = async (projectId: string, startIso: string, hours: number, taskId = null) => {
    const startedAt = new Date(startIso);
    await db.insert(timeEntries).values({
      id: randomUUID(),
      userId,
      projectId,
      taskId,
      startedAt,
      endedAt: new Date(startedAt.getTime() + hours * 3_600_000),
    });
  };

  /** The router's window read, replicated: entries joined DIRECTLY to projects. */
  const readPeriod = async () =>
    db
      .select({
        projectId: timeEntries.projectId,
        taskId: timeEntries.taskId,
        billable: timeEntries.billable,
        startedAt: timeEntries.startedAt,
        endedAt: timeEntries.endedAt,
        projectName: projects.name,
        category: projects.category,
        clientId: projects.clientId,
      })
      .from(timeEntries)
      .innerJoin(projects, eq(timeEntries.projectId, projects.id))
      .where(
        and(
          eq(timeEntries.userId, userId),
          gte(timeEntries.startedAt, period.start),
          lt(timeEntries.startedAt, period.end)
        )
      );

  beforeEach(() => {
    db = createSqliteDb(":memory:").db;
  });

  it("counts a project-only entry, with no task, exactly like a tasked one", async () => {
    // The task-joined roll-up drops these; the Budget and the Ledger must not.
    const project = await addProject("Client calls", "business");
    await logHours(project.id, "2026-08-17T09:00:00.000Z", 2);

    const rows = await readPeriod();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.taskId).toBeNull();
  });

  it("includes the closing Thursday and excludes the review Friday", async () => {
    const project = await addProject("Build", "business");
    await logHours(project.id, "2026-08-13T09:00:00.000Z", 1); // day before the period
    await logHours(project.id, "2026-08-14T09:00:00.000Z", 1); // first day
    await logHours(project.id, "2026-08-27T09:00:00.000Z", 1); // last day
    await logHours(project.id, "2026-08-28T09:00:00.000Z", 1); // closes it — next period

    const rows = await readPeriod();
    expect(rows).toHaveLength(2);
  });

  it("produces the said-vs-spent read from real rows", async () => {
    const [client] = await db
      .insert(clients)
      .values({ id: randomUUID(), userId, orgId, name: "Great White" })
      .returning();
    const billed = await addProject("GW — Build", "business", client!.id);
    const house = await addProject("House", "personal");
    await logHours(billed.id, "2026-08-17T09:00:00.000Z", 41);
    await logHours(house.id, "2026-08-18T09:00:00.000Z", 59);

    const rows = await readPeriod();
    const ledger = computeLedger({
      entries: rows.map((r) => ({
        projectId: r.projectId,
        taskId: r.taskId,
        billable: r.billable,
        seconds: Math.floor((r.endedAt!.getTime() - r.startedAt.getTime()) / 1000),
      })),
      projects: rows.map((r) => ({
        id: r.projectId,
        name: r.projectName,
        clientId: r.clientId,
        category: r.category,
      })),
      clients: [{ id: client!.id, name: client!.name }],
      tiltBusinessPct: 70,
    });

    expect(ledger.bar.tiltBusinessPct).toBe(70);
    expect(ledger.bar.actualBusinessPct).toBe(41);
    expect(ledger.groups[0]!.name).toBe("Great White");
  });

  it("seals a fortnight once — a second seal is a no-op, not a duplicate", async () => {
    const values = {
      userId,
      periodStart: period.startDate,
      tiltBusinessPct: 70,
      businessSeconds: 100,
      personalSeconds: 100,
      breakdown: [],
    };
    await db.insert(ledgerPeriods).values({ id: randomUUID(), ...values });
    await db
      .insert(ledgerPeriods)
      .values({ id: randomUUID(), ...values, tiltBusinessPct: 40 })
      .onConflictDoNothing();

    const rows = await db.select().from(ledgerPeriods).where(eq(ledgerPeriods.userId, userId));
    expect(rows).toHaveLength(1);
    // The seal holds the tilt as first frozen — a later redeclaration cannot rewrite it.
    expect(rows[0]!.tiltBusinessPct).toBe(70);
  });
});

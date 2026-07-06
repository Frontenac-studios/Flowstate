import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { createSqliteDb, type SqliteDb } from "../index";
import { careEvents } from "./care-events";
import { phases } from "./phases";
import { projects } from "./projects";

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
        category: "professional",
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
      .values({ userId, name: "P", slug: "p", category: "adulting" })
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
});

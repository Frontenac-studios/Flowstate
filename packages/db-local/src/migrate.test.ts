import Database from "better-sqlite3";
import { and, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { describe, expect, it } from "vitest";

import { createSqliteDb, runSqliteMigrations, schema } from "./index";
import { projectMilestones } from "./schema/project-milestones";
import { projects } from "./schema/projects";

const USER = "11111111-1111-1111-1111-111111111111";

// Regression: `projects.list` filters archived projects with `isNull(projects.archivedAt)`.
// When the SQLite `projects` table was missing `archived_at`, Drizzle emitted a dangling
// `IS NULL` and SQLite failed to parse it (`near "is": syntax error`) — the desktop
// Projects page showed "Your projects didn't load."
describe("sqlite projects.archived_at", () => {
  it("runs the archived-filter query on a freshly migrated db", async () => {
    const db = createSqliteDb(":memory:").db;
    await db.insert(projects).values({ userId: USER, name: "P", slug: "p", category: "adulting" });

    const rows = await db
      .select()
      .from(projects)
      .where(and(eq(projects.userId, USER), isNull(projects.archivedAt)));

    expect(rows).toHaveLength(1);
    expect(rows[0]!.archivedAt).toBeNull();
  });

  it("backfills archived_at onto a db created before the column existed", () => {
    const sqlite = new Database(":memory:");
    // The old projects shape, as created by earlier versions before archived_at.
    sqlite
      .prepare(
        `CREATE TABLE projects (
          id TEXT PRIMARY KEY NOT NULL,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          slug TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'adulting',
          embedding TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )`
      )
      .run();
    const columns = () =>
      (sqlite.prepare("PRAGMA table_info(projects)").all() as Array<{ name: string }>).map(
        (c) => c.name
      );
    expect(columns()).not.toContain("archived_at");

    runSqliteMigrations(sqlite);
    expect(columns()).toContain("archived_at");

    // The Drizzle isNull filter now prepares and runs instead of throwing.
    const db = drizzle(sqlite, { schema });
    expect(() => db.select().from(projects).where(isNull(projects.archivedAt)).all()).not.toThrow();
  });
});

// Guards the desktop SQLite mirror for the project_milestones table (PR2). A missing
// mirror is the `archived_at`-style drift that breaks the desktop app when the server
// schema adds a table the local DB doesn't have.
describe("sqlite project_milestones", () => {
  it("creates the table on a freshly migrated db and round-trips a row", async () => {
    const db = createSqliteDb(":memory:").db;
    await db.insert(projects).values({ userId: USER, name: "P", slug: "p", category: "adulting" });
    const [project] = await db.select().from(projects).where(eq(projects.userId, USER));

    await db.insert(projectMilestones).values({
      userId: USER,
      projectId: project!.id,
      title: "Lease signed",
      targetDate: "2026-08-01",
    });

    const rows = await db
      .select()
      .from(projectMilestones)
      .where(and(eq(projectMilestones.userId, USER), eq(projectMilestones.projectId, project!.id)));

    expect(rows).toHaveLength(1);
    expect(rows[0]!.title).toBe("Lease signed");
    expect(rows[0]!.targetDate).toBe("2026-08-01");
    expect(rows[0]!.completedAt).toBeNull();
  });
});

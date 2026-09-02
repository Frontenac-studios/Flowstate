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
    await db.insert(projects).values({ userId: USER, name: "P", slug: "p", category: "personal" });

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
    await db.insert(projects).values({ userId: USER, name: "P", slug: "p", category: "personal" });
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

// Guards the org-bootstrap fix (drizzle/0059) on the desktop mirror. The unique
// index is what makes `ensureOrgForUser` idempotent under concurrency, and it has
// to survive being added to a local DB that predates the column — including one
// already holding the two orgs the fix exists to prevent.
describe("sqlite orgs.personal_for_user_id", () => {
  it("adds the column and its unique index to a db created before either existed", () => {
    const sqlite = new Database(":memory:");
    // The old orgs shape, as created by earlier versions.
    sqlite
      .prepare(
        `CREATE TABLE orgs (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )`
      )
      .run();
    // The broken state this fixes: one user, two orgs, created_at to the
    // millisecond apart. Migrating must not choke on it — every existing row is
    // left NULL, and NULLs are distinct under a unique index.
    const now = Date.now();
    for (const id of ["org-one", "org-two"]) {
      sqlite
        .prepare("INSERT INTO orgs (id, name, created_at, updated_at) VALUES (?, 'Personal', ?, ?)")
        .run(id, now, now);
    }

    const columns = () =>
      (sqlite.prepare("PRAGMA table_info(orgs)").all() as Array<{ name: string }>).map(
        (c) => c.name
      );
    expect(columns()).not.toContain("personal_for_user_id");

    runSqliteMigrations(sqlite);

    expect(columns()).toContain("personal_for_user_id");
    const indexes = (
      sqlite.prepare("PRAGMA index_list(orgs)").all() as Array<{ name: string; unique: number }>
    ).filter((i) => i.name === "orgs_personal_for_user_id_idx");
    expect(indexes).toHaveLength(1);
    expect(indexes[0]!.unique).toBe(1);

    // The index actually bites: a second personal org for the same user is refused.
    const claim = (id: string) =>
      sqlite
        .prepare(
          "INSERT INTO orgs (id, name, personal_for_user_id, created_at, updated_at) VALUES (?, 'Personal', ?, ?, ?)"
        )
        .run(id, USER, now, now);

    claim("org-three");
    expect(() => claim("org-four")).toThrow(/UNIQUE constraint failed/);
  });
});

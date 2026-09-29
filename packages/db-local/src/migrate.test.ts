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

// Regression: Postgres collapsed the five legacy categories into business/personal in
// drizzle/0045, but the local mirror stores plain text and kept the old labels, so
// `categorySolidVar` resolved to `--cat-undefined-solid` and stripes rendered blank.
describe("sqlite legacy category remap", () => {
  it("collapses legacy labels the way drizzle/0045 did, preserving NULLs", () => {
    const sqlite = new Database(":memory:");
    runSqliteMigrations(sqlite);

    const legacy = ["professional", "personal_projects", "relationships", "body_mind", "adulting"];
    const insertProject = sqlite.prepare(
      "INSERT INTO projects (id, user_id, name, slug, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, 0)"
    );
    const insertTask = sqlite.prepare(
      "INSERT INTO tasks (id, user_id, title, category, created_at, updated_at) VALUES (?, ?, 't', ?, 0, 0)"
    );
    const insertSetting = sqlite.prepare(
      "INSERT INTO category_settings (user_id, category, created_at, updated_at) VALUES (?, ?, 0, 0)"
    );
    [...legacy, "business", "personal"].forEach((category, i) => {
      insertProject.run(`p${i}`, USER, `P${i}`, `p${i}`, category);
      insertTask.run(`t${i}`, USER, category);
      insertSetting.run(USER, category);
    });
    insertTask.run("t-null", USER, null);
    sqlite
      .prepare(
        "INSERT INTO app_settings (user_id, last_used_category, created_at, updated_at) VALUES (?, 'professional', 0, 0)"
      )
      .run(USER);

    runSqliteMigrations(sqlite);

    const categoryOf = (table: string, id: string) =>
      (
        sqlite.prepare(`SELECT category FROM ${table} WHERE id = ?`).get(id) as {
          category: string | null;
        }
      ).category;
    const expected = [
      "business",
      "personal",
      "personal",
      "personal",
      "personal",
      "business",
      "personal",
    ];
    expected.forEach((category, i) => {
      expect(categoryOf("projects", `p${i}`)).toBe(category);
      expect(categoryOf("tasks", `t${i}`)).toBe(category);
    });
    expect(categoryOf("tasks", "t-null")).toBeNull();
    expect(
      (sqlite.prepare("SELECT last_used_category AS c FROM app_settings").get() as { c: string }).c
    ).toBe("business");
    // Seven labels fold into two primary-key rows without a constraint error.
    expect(
      (
        sqlite.prepare("SELECT category FROM category_settings ORDER BY category").all() as Array<{
          category: string;
        }>
      ).map((r) => r.category)
    ).toEqual(["business", "personal"]);

    // Idempotent: a second pass changes nothing.
    expect(() => runSqliteMigrations(sqlite)).not.toThrow();
    expect(categoryOf("projects", "p1")).toBe("personal");
  });
});

// Spec v2 per-project hue: a local DB from before the column gets it, and existing
// business projects are numbered 1–8 in creation order (live first), mirroring
// drizzle/0065. Personal projects stay NULL; a chosen hue is never overwritten.
describe("sqlite projects.hue", () => {
  it("adds hue and backfills business projects in creation order", () => {
    const sqlite = new Database(":memory:");
    runSqliteMigrations(sqlite);
    const insert = sqlite.prepare(
      `INSERT INTO projects (id, user_id, name, slug, category, created_at, updated_at, archived_at, hue)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insert.run("a", USER, "A", "a", "business", 1, 1, null, null);
    insert.run("old", USER, "Old", "old", "business", 0, 0, 5, null); // archived → numbered last
    insert.run("b", USER, "B", "b", "business", 2, 2, null, null);
    insert.run("p", USER, "P", "p", "personal", 3, 3, null, null);
    insert.run("c", USER, "C", "c", "business", 4, 4, null, 7); // user-chosen hue

    runSqliteMigrations(sqlite);

    const hues = Object.fromEntries(
      (
        sqlite.prepare("SELECT id, hue FROM projects").all() as Array<{
          id: string;
          hue: number | null;
        }>
      ).map((r) => [r.id, r.hue])
    );
    expect(hues).toEqual({ a: 1, b: 2, c: 7, old: 4, p: null });
  });
});

// Spec v5 DetailA: tasks gain due_date + notes (ADDED_COLUMNS) and a checklist table
// that cascades with its task.
describe("sqlite task detail (due_date, notes, checklist)", () => {
  it("adds due_date and notes to an existing tasks table", () => {
    const sqlite = new Database(":memory:");
    runSqliteMigrations(sqlite);
    const columns = (
      sqlite.prepare("PRAGMA table_info(tasks)").all() as Array<{ name: string }>
    ).map((c) => c.name);
    expect(columns).toEqual(expect.arrayContaining(["due_date", "notes"]));
  });

  it("round-trips a checklist item and cascades it with its task", async () => {
    const { db, sqlite } = createSqliteDb(":memory:");
    sqlite.pragma("foreign_keys = ON");
    const [task] = await db
      .insert(schema.tasks)
      .values({
        userId: USER,
        title: "Review wireframes",
        category: "business",
        dueDate: "2026-10-01",
        notes: "hero copy",
      })
      .returning();
    await db
      .insert(schema.taskChecklistItems)
      .values({ userId: USER, taskId: task!.id, text: "Desktop frames" });

    const items = await db.select().from(schema.taskChecklistItems);
    expect(items).toHaveLength(1);
    expect(items[0]!.doneAt).toBeNull();
    expect(items[0]!.sortOrder).toBe(0);

    await db.delete(schema.tasks).where(eq(schema.tasks.id, task!.id));
    expect(await db.select().from(schema.taskChecklistItems)).toHaveLength(0);
  });
});

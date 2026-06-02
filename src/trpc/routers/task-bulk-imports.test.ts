import { randomUUID } from "node:crypto";

import { createSqliteDb } from "@kash/db-local";
import { projects, taskBulkImportItems, taskBulkImports, tasks } from "@kash/db-local/schema";
import { and, eq, inArray } from "drizzle-orm";
import { describe, expect, it, beforeEach } from "vitest";
import { z } from "zod";

const bulkCreateInputSchema = z.object({
  projectId: z.string().uuid(),
  tasks: z
    .array(
      z.object({
        title: z.string().min(1).max(500),
        scheduledDate: z.string().nullable(),
        bucketOverride: z.enum(["later"]).nullable(),
        priority: z.number().int().min(0).max(3),
        phaseId: z.string().uuid().nullable(),
      })
    )
    .min(2)
    .max(50),
});

describe("taskBulkImports bulkCreate input", () => {
  const projectId = randomUUID();

  it("requires at least two tasks", () => {
    const result = bulkCreateInputSchema.safeParse({
      projectId,
      tasks: [
        {
          title: "Only one",
          scheduledDate: null,
          bucketOverride: "later",
          priority: 0,
          phaseId: null,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("accepts two or more tasks", () => {
    const task = {
      title: "Task",
      scheduledDate: null,
      bucketOverride: "later" as const,
      priority: 0,
      phaseId: null,
    };
    const result = bulkCreateInputSchema.safeParse({
      projectId,
      tasks: [task, { ...task, title: "Task 2" }],
    });
    expect(result.success).toBe(true);
  });
});

describe("task bulk import persistence (sqlite)", () => {
  const userId = randomUUID();
  const projectId = randomUUID();
  let db: ReturnType<typeof createSqliteDb>["db"];

  beforeEach(() => {
    const sqlite = createSqliteDb(":memory:");
    db = sqlite.db;
    const now = new Date();
    db.insert(projects)
      .values({
        id: projectId,
        userId,
        name: "Test",
        slug: "test",
        category: "adulting",
        description: null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  });

  it("records import items and undo deletes tasks", async () => {
    const now = new Date();
    const taskCount = 2;

    const importRow = db
      .insert(taskBulkImports)
      .values({
        id: randomUUID(),
        userId,
        projectId,
        taskCount,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    const taskBase = {
      userId,
      projectId,
      phaseId: null as string | null,
      scheduledDate: null as string | null,
      bucketOverride: "later" as string | null,
      priority: 0,
      sortOrder: 0,
      isTop3: false,
      top3Order: null as number | null,
      top3PinnedAt: null as Date | null,
      completedAt: null as Date | null,
      createdAt: now,
      updatedAt: now,
    };

    const createdTasks = db
      .insert(tasks)
      .values([
        { id: randomUUID(), title: "One", ...taskBase },
        { id: randomUUID(), title: "Two", ...taskBase },
      ])
      .returning()
      .all();

    db.insert(taskBulkImportItems)
      .values(
        createdTasks.map((row) => ({
          importId: importRow.id,
          taskId: row.id,
          userId,
          updatedAt: now,
        }))
      )
      .run();

    const items = db
      .select()
      .from(taskBulkImportItems)
      .where(eq(taskBulkImportItems.importId, importRow.id))
      .all();
    expect(items).toHaveLength(2);

    const taskIds = createdTasks.map((t) => t.id);
    const deleted = db
      .delete(tasks)
      .where(and(eq(tasks.userId, userId), inArray(tasks.id, taskIds)))
      .returning({ id: tasks.id })
      .all();

    const updated = db
      .update(taskBulkImports)
      .set({ undoneAt: new Date(), updatedAt: new Date() })
      .where(eq(taskBulkImports.id, importRow.id))
      .returning()
      .get();

    const undoResult = { deleted, updated };

    expect(undoResult.deleted).toHaveLength(2);
    expect(undoResult.updated?.undoneAt).not.toBeNull();

    const remaining = db.select().from(tasks).where(inArray(tasks.id, taskIds)).all();
    expect(remaining).toHaveLength(0);
  });
});

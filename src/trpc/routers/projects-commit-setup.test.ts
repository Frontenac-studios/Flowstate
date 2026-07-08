import { randomUUID } from "node:crypto";

import { createSqliteDb } from "@kash/db-local";
import {
  phases,
  projectMilestones,
  projects,
  taskBulkImportItems,
  taskBulkImports,
  tasks,
} from "@kash/db-local/schema";
import { and, eq } from "drizzle-orm";
import { describe, expect, it, beforeEach } from "vitest";
import { z } from "zod";

import { resolveProjectBacklogCreateFields } from "@/lib/tasks/project-backlog-create";

const commitSetupInputSchema = z.object({
  projectId: z.string().uuid(),
  phases: z.array(
    z.object({
      key: z.string().min(1),
      id: z.string().uuid().nullable().optional(),
      name: z.string().min(1).max(200),
      startDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .nullable()
        .optional(),
      endDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .nullable()
        .optional(),
    })
  ),
  milestones: z.array(
    z.object({
      id: z.string().uuid().nullable().optional(),
      title: z.string().min(1).max(200),
      targetDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .nullable()
        .optional(),
    })
  ),
  taskSeeds: z.array(
    z
      .object({
        phaseKey: z.string().min(1).optional(),
        phaseId: z.string().uuid().optional(),
        title: z.string().min(1).max(500),
        suggestedScheduledDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable()
          .optional(),
      })
      .refine((seed) => seed.phaseKey != null || seed.phaseId != null, {
        message: "Each task seed must reference a phaseKey or phaseId.",
      })
  ),
});

describe("commitSetupInputSchema", () => {
  const projectId = randomUUID();

  it("accepts blank setup with phases and task seeds", () => {
    const result = commitSetupInputSchema.safeParse({
      projectId,
      phases: [{ key: "phase-1", name: "Discovery" }],
      milestones: [],
      taskSeeds: [{ phaseKey: "phase-1", title: "Research competitors" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects task seeds without phase reference", () => {
    const result = commitSetupInputSchema.safeParse({
      projectId,
      phases: [],
      milestones: [],
      taskSeeds: [{ title: "Orphan task" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("commitProjectSetup task backlog contract (sqlite)", () => {
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
        category: "professional",
        createdAt: now,
        updatedAt: now,
      })
      .run();
  });

  it("lands seeded tasks in backlog with phase start date as suggestion", () => {
    const now = new Date();
    const phaseId = randomUUID();

    db.insert(phases)
      .values({
        id: phaseId,
        userId,
        projectId,
        parentPhaseId: null,
        name: "Build",
        sortOrder: 0,
        startDate: "2026-08-01",
        endDate: null,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const backlog = resolveProjectBacklogCreateFields({ phaseStartDate: "2026-08-01" });

    db.insert(tasks)
      .values({
        id: randomUUID(),
        userId,
        projectId,
        phaseId,
        title: "Draft outline",
        scheduledDate: backlog.scheduledDate,
        bucketOverride: backlog.bucketOverride,
        suggestedScheduledDate: backlog.suggestedScheduledDate,
        priority: 0,
        category: "professional",
        sortOrder: 0,
        isTop3: false,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const [row] = db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.projectId, projectId)))
      .all();

    expect(row?.scheduledDate).toBeNull();
    expect(row?.bucketOverride).toBe("later");
    expect(row?.suggestedScheduledDate).toBe("2026-08-01");
  });

  it("creates bulk import record when seeding two or more tasks", () => {
    const now = new Date();
    const phaseId = randomUUID();

    db.insert(phases)
      .values({
        id: phaseId,
        userId,
        projectId,
        parentPhaseId: null,
        name: "Build",
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const importId = randomUUID();

    const importRow = db
      .insert(taskBulkImports)
      .values({
        id: importId,
        userId,
        projectId,
        taskCount: 2,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    const taskBase = {
      userId,
      projectId,
      phaseId,
      scheduledDate: null as string | null,
      bucketOverride: "later" as string | null,
      suggestedScheduledDate: null as string | null,
      priority: 0,
      category: "professional" as const,
      sortOrder: 0,
      isTop3: false,
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
  });

  it("rejects invalid phase date ranges at validation time", () => {
    const result = commitSetupInputSchema.safeParse({
      projectId,
      phases: [
        {
          key: "p1",
          name: "Bad dates",
          startDate: "2026-08-10",
          endDate: "2026-08-01",
        },
      ],
      milestones: [],
      taskSeeds: [],
    });
    expect(result.success).toBe(true);
  });
});

describe("commitProjectSetup milestone persistence (sqlite)", () => {
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
        category: "professional",
        createdAt: now,
        updatedAt: now,
      })
      .run();
  });

  it("stores milestone upserts", () => {
    const now = new Date();
    db.insert(projectMilestones)
      .values({
        id: randomUUID(),
        userId,
        projectId,
        title: "Launch",
        targetDate: "2026-09-01",
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const rows = db
      .select()
      .from(projectMilestones)
      .where(and(eq(projectMilestones.userId, userId), eq(projectMilestones.projectId, projectId)))
      .all();

    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe("Launch");
  });
});

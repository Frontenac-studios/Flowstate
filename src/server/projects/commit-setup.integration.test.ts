import { randomUUID } from "node:crypto";

import { phases, projects } from "@kash/db-local/schema";
import { beforeEach, describe, expect, it, vi } from "vitest";

const syncFns = vi.hoisted(() => ({
  syncProjectRow: vi.fn(async () => undefined),
  syncPhaseRow: vi.fn(async () => undefined),
  syncProjectMilestoneRow: vi.fn(async () => undefined),
  syncTaskBulkImportRow: vi.fn(async () => undefined),
  syncTaskBulkImportItemRow: vi.fn(async () => undefined),
  syncTaskRow: vi.fn(async () => undefined),
}));

vi.mock("@/db/record-sync-mutation", () => syncFns);

describe("commitProjectSetup integration (sqlite)", () => {
  const userId = randomUUID();
  const projectId = randomUUID();
  let phaseIds: string[];

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("DATABASE_MODE", "sqlite");

    phaseIds = ["Pre-move", "Moving Things", "Post-move"].map(() => randomUUID());

    vi.doMock("@/db", async () => {
      const { createSqliteDb: createDb } = await import("@kash/db-local");
      const { db } = createDb(":memory:");
      const now = new Date();

      db.insert(projects)
        .values({
          id: projectId,
          userId,
          name: "Move",
          slug: "move",
          category: "adulting",
          createdAt: now,
          updatedAt: now,
        })
        .run();

      ["Pre-move", "Moving Things", "Post-move"].forEach((name, index) => {
        db.insert(phases)
          .values({
            id: phaseIds[index]!,
            userId,
            projectId,
            parentPhaseId: null,
            name,
            sortOrder: index,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      });

      return { db };
    });
  });

  it("saves edit-mode setup with empty task seeds", async () => {
    const { commitProjectSetup } = await import("./commit-setup");

    const result = await commitProjectSetup(userId, {
      projectId,
      phases: phaseIds.map((id, index) => ({
        key: id,
        id,
        name: ["Pre-move", "Moving Things", "Post-move"][index]!,
        startDate: null,
        endDate: null,
      })),
      milestones: [],
      taskSeeds: [],
    });

    expect(result.phasesUpdated).toBe(3);
    expect(result.tasksCreated).toBe(0);
    expect(syncFns.syncPhaseRow).toHaveBeenCalledTimes(3);
  });
});

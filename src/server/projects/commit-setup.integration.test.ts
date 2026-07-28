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

  // Regression: the setup wizard seeds drafts once on open, so opening before its
  // milestones query resolved produced id-less drafts for milestones that already
  // existed, and every Save inserted another copy.
  it("does not re-insert milestones that already exist when drafts arrive without ids", async () => {
    const { commitProjectSetup } = await import("./commit-setup");

    const milestones = [
      { title: "Tell Roger moving plans", targetDate: "2026-07-20" },
      { title: "Put in HUME 2 weeks notice", targetDate: "2026-08-03" },
    ];
    const commit = () =>
      commitProjectSetup(userId, { projectId, phases: [], milestones, taskSeeds: [] });

    const first = await commit();
    expect(first.milestonesCreated).toBe(2);
    expect(first.milestonesSkipped).toBe(0);

    // Same id-less payload again — the wizard reopening before milestones resolve.
    const second = await commit();
    expect(second.milestonesCreated).toBe(0);
    expect(second.milestonesSkipped).toBe(2);

    expect(syncFns.syncProjectMilestoneRow).toHaveBeenCalledTimes(2);
  });

  it("still inserts a milestone whose title or date is genuinely new", async () => {
    const { commitProjectSetup } = await import("./commit-setup");

    await commitProjectSetup(userId, {
      projectId,
      phases: [],
      milestones: [{ title: "Tell Roger moving plans", targetDate: "2026-07-20" }],
      taskSeeds: [],
    });

    const result = await commitProjectSetup(userId, {
      projectId,
      phases: [],
      milestones: [
        { title: "Tell Roger moving plans", targetDate: "2026-07-20" },
        // same title, different date
        { title: "Tell Roger moving plans", targetDate: "2026-07-27" },
        { title: "Book movers", targetDate: null },
      ],
      taskSeeds: [],
    });

    expect(result.milestonesCreated).toBe(2);
    expect(result.milestonesSkipped).toBe(1);
  });

  it("collapses duplicates inside a single submission", async () => {
    const { commitProjectSetup } = await import("./commit-setup");

    const result = await commitProjectSetup(userId, {
      projectId,
      phases: [],
      milestones: [
        { title: "Book movers", targetDate: "2026-08-01" },
        { title: "Book movers", targetDate: "2026-08-01" },
      ],
      taskSeeds: [],
    });

    expect(result.milestonesCreated).toBe(1);
    expect(result.milestonesSkipped).toBe(1);
  });
});

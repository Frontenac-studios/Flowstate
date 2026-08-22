import { randomUUID } from "node:crypto";

import { createSqliteDb } from "@kash/db-local";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AppDb } from "@/db";
// Pg-typed handle that resolves to the SQLite mirror at runtime (DATABASE_MODE
// stubbed below) — the same indirection the app uses.
import { projects } from "@/db/tables";

import {
  goalLayerProjectCondition,
  isGoalLayerEligible,
  selectGoalLayerProjects,
} from "./goal-layer";

// Must run before the imports above evaluate: `src/db/tables.ts` picks the Postgres
// or SQLite table objects at module load.
vi.hoisted(() => {
  process.env.DATABASE_MODE = "sqlite";
});

describe("goal-layer maintenance exclusion", () => {
  const userId = randomUUID();
  let db: AppDb;

  beforeEach(() => {
    db = createSqliteDb(":memory:").db as unknown as AppDb;
  });

  it("excludes a maintenance project from a goal-layer (Target progress) query", async () => {
    await db.insert(projects).values([
      { userId, name: "Great White", slug: "great-white", category: "business", state: "active" },
      {
        userId,
        name: "Home upkeep",
        slug: "home-upkeep",
        category: "personal",
        state: "active",
        isMaintenance: true,
      },
    ] as never);

    // This is the shape a Target-progress rollup takes: select the projects that
    // count toward a goal. The maintenance project must never appear.
    const eligible = await db.select().from(projects).where(goalLayerProjectCondition());

    expect(eligible).toHaveLength(1);
    expect(eligible[0]!.name).toBe("Great White");
    expect(eligible.some((p) => p.isMaintenance)).toBe(false);
  });

  it("pure filter drops maintenance projects", () => {
    const rows = [
      { id: "a", isMaintenance: false },
      { id: "b", isMaintenance: true },
      { id: "c", isMaintenance: false },
    ];
    expect(selectGoalLayerProjects(rows).map((r) => r.id)).toEqual(["a", "c"]);
  });

  it("isGoalLayerEligible is false for maintenance projects", () => {
    expect(isGoalLayerEligible({ isMaintenance: false })).toBe(true);
    expect(isGoalLayerEligible({ isMaintenance: true })).toBe(false);
  });
});

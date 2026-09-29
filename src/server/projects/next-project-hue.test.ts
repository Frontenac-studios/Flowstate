import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/db/tables", () => ({
  projects: { hue: "hue", userId: "user_id", category: "category", archivedAt: "archived_at" },
}));

import { hueForNewProject, huePatchForCategoryChange } from "./next-project-hue";

const USER = "11111111-1111-1111-1111-111111111111";

/** A stand-in executor whose select().from().where() resolves to `hues`. */
function executorWith(hues: Array<number | null>) {
  const where = vi.fn().mockResolvedValue(hues.map((hue) => ({ hue })));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  return { select } as unknown as Parameters<typeof hueForNewProject>[0];
}

describe("hueForNewProject", () => {
  it("gives a business project the next hue in order", async () => {
    await expect(hueForNewProject(executorWith([1, 2]), USER, "business")).resolves.toBe(3);
  });

  it("gives a personal project no hue (always purple)", async () => {
    await expect(hueForNewProject(executorWith([1]), USER, "personal")).resolves.toBeNull();
  });
});

describe("huePatchForCategoryChange", () => {
  it("leaves hue alone when the category does not change", async () => {
    await expect(
      huePatchForCategoryChange(
        executorWith([]),
        USER,
        { category: "business", hue: 4 },
        "business"
      )
    ).resolves.toBeUndefined();
  });

  it("drops the hue when a project becomes personal", async () => {
    await expect(
      huePatchForCategoryChange(
        executorWith([]),
        USER,
        { category: "business", hue: 4 },
        "personal"
      )
    ).resolves.toEqual({ hue: null });
  });

  it("assigns the next hue when a project becomes business", async () => {
    await expect(
      huePatchForCategoryChange(
        executorWith([1]),
        USER,
        { category: "personal", hue: null },
        "business"
      )
    ).resolves.toEqual({ hue: 2 });
  });
});

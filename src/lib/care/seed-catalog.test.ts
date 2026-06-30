import { describe, expect, it } from "vitest";

import {
  CARE_CADENCES as SCHEMA_CADENCES,
  CARE_KINDS as SCHEMA_KINDS,
  CARE_THEMES as SCHEMA_THEMES,
} from "@/db/schema/care-enums";

import { SEED_CATALOG } from "./seed-catalog";
import { CARE_CADENCES, CARE_KINDS, CARE_THEMES } from "./types";

describe("care enum tuples (drift guard)", () => {
  // src/lib/care keeps its own copies of the enum tuples to stay drizzle-free.
  // These assertions fail loudly if the schema (CL1) and the local mirror diverge.
  it("themes match src/db/schema/care-enums.ts", () => {
    expect([...CARE_THEMES]).toEqual([...SCHEMA_THEMES]);
  });
  it("kinds match src/db/schema/care-enums.ts", () => {
    expect([...CARE_KINDS]).toEqual([...SCHEMA_KINDS]);
  });
  it("cadences match src/db/schema/care-enums.ts", () => {
    expect([...CARE_CADENCES]).toEqual([...SCHEMA_CADENCES]);
  });
});

describe("SEED_CATALOG", () => {
  it("has 24 practices (4 per theme)", () => {
    expect(SEED_CATALOG).toHaveLength(24);
  });

  it("has unique catalog keys", () => {
    const keys = SEED_CATALOG.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("uses only valid enum values for theme/kind/cadence", () => {
    for (const p of SEED_CATALOG) {
      expect(CARE_THEMES).toContain(p.theme);
      if (p.kind !== undefined) expect(CARE_KINDS).toContain(p.kind);
      if (p.cadence !== undefined) expect(CARE_CADENCES).toContain(p.cadence);
    }
  });

  it("has no duplicate titles within a theme", () => {
    for (const theme of CARE_THEMES) {
      const titles = SEED_CATALOG.filter((p) => p.theme === theme).map((p) => p.title);
      expect(new Set(titles).size).toBe(titles.length);
    }
  });

  it("keys are prefixed with their theme", () => {
    for (const p of SEED_CATALOG) {
      expect(p.key.startsWith(`${p.theme}_`)).toBe(true);
    }
  });

  it("is frozen (static data)", () => {
    expect(Object.isFrozen(SEED_CATALOG)).toBe(true);
  });
});

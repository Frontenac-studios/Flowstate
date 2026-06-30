import { describe, expect, it } from "vitest";

import { availableCatalog, CATALOG_KEYS, isCatalogKey } from "./catalog";
import { SEED_CATALOG } from "./seed-catalog";

describe("isCatalogKey", () => {
  it("accepts a real catalog key", () => {
    expect(isCatalogKey("move_walk_10")).toBe(true);
  });

  it("rejects an unknown key", () => {
    expect(isCatalogKey("not_a_real_key")).toBe(false);
    expect(isCatalogKey("")).toBe(false);
  });

  it("covers every shipped seed key", () => {
    expect(CATALOG_KEYS.size).toBe(SEED_CATALOG.length);
    for (const practice of SEED_CATALOG) {
      expect(isCatalogKey(practice.key)).toBe(true);
    }
  });
});

describe("availableCatalog", () => {
  it("returns the full catalog when nothing is adopted", () => {
    expect(availableCatalog([])).toHaveLength(SEED_CATALOG.length);
    expect(availableCatalog(new Set())).toEqual(SEED_CATALOG.map((p) => ({ ...p })));
  });

  it("filters out adopted keys", () => {
    const result = availableCatalog(["move_walk_10", "calm_breathing_2"]);
    expect(result).toHaveLength(SEED_CATALOG.length - 2);
    expect(result.map((p) => p.key)).not.toContain("move_walk_10");
    expect(result.map((p) => p.key)).not.toContain("calm_breathing_2");
  });

  it("accepts a Set of adopted keys", () => {
    const result = availableCatalog(new Set(["nourish_water"]));
    expect(result.map((p) => p.key)).not.toContain("nourish_water");
    expect(result).toHaveLength(SEED_CATALOG.length - 1);
  });

  it("ignores unknown adopted keys (e.g. retired practices)", () => {
    const result = availableCatalog(["ghost_key", "another_ghost"]);
    expect(result).toHaveLength(SEED_CATALOG.length);
  });

  it("returns an empty list when every key is adopted", () => {
    const result = availableCatalog(SEED_CATALOG.map((p) => p.key));
    expect(result).toHaveLength(0);
  });
});

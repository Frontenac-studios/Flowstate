import { describe, expect, it } from "vitest";
import { buildConstellations, buildSkyStars, type ConstellationItem } from "./constellations";
const NOW = new Date("2026-07-01T12:00:00Z");
const item = (o: Partial<ConstellationItem> = {}): ConstellationItem => ({
  id: "a",
  title: "n",
  type: "idea",
  embedding: null,
  resurfaceCount: 0,
  lastTouchedAt: NOW,
  tags: null,
  ...o,
});
describe("buildSkyStars", () => {
  it("stable", () => {
    expect(buildSkyStars([item({ id: "x" })], { now: NOW })[0]?.x).toBe(
      buildSkyStars([item({ id: "x" })], { now: NOW })[0]?.x
    );
  });
});
describe("buildConstellations", () => {
  it("tag", () => {
    expect(
      buildConstellations([item({ id: "1", tags: ["a"] }), item({ id: "2", tags: ["a"] })]).length
    ).toBe(1);
  });
});

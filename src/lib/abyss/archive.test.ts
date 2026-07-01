import { describe, expect, it } from "vitest";
import { DEFAULT_ABYSS_ARCHIVE_AFTER_DAYS } from "@/lib/settings/constants";
import { resolveArchiveThresholdDays, selectItemsToArchive } from "./archive";
const NOW = new Date("2026-07-01T12:00:00Z");
describe("resolveArchiveThresholdDays", () => {
  it("default", () =>
    expect(resolveArchiveThresholdDays(null)).toBe(DEFAULT_ABYSS_ARCHIVE_AFTER_DAYS));
});
describe("selectItemsToArchive", () => {
  it("stale", () =>
    expect(
      selectItemsToArchive(
        [{ id: "s", status: "active", lastTouchedAt: new Date(NOW.getTime() - 90 * 86400000) }],
        NOW,
        90
      )
    ).toEqual(["s"]));
});

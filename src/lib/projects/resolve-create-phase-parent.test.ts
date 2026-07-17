import { describe, expect, it } from "vitest";

import { resolveCreatePhaseParent } from "./resolve-create-phase-parent";

const TODAY_ID = "00000000-0000-4000-8000-000000000001";
const WEEK_ID = "00000000-0000-4000-8000-000000000002";

const phases = [
  { id: TODAY_ID, name: "Today", parentPhaseId: null },
  { id: WEEK_ID, name: "This Week", parentPhaseId: null },
];

describe("resolveCreatePhaseParent", () => {
  it("resolves a UUID parentPhaseId", () => {
    const result = resolveCreatePhaseParent({ parentPhaseId: TODAY_ID }, phases);
    expect(result).toEqual({
      ok: true,
      parentPhaseId: TODAY_ID,
      parentPhaseName: "Today",
    });
  });

  it("resolves parentPhaseName when id is omitted", () => {
    const result = resolveCreatePhaseParent({ parentPhaseName: "Today" }, phases);
    expect(result).toEqual({
      ok: true,
      parentPhaseId: TODAY_ID,
      parentPhaseName: "Today",
    });
  });

  it("treats a non-UUID parentPhaseId as a phase name", () => {
    const result = resolveCreatePhaseParent({ parentPhaseId: "Today" }, phases);
    expect(result).toEqual({
      ok: true,
      parentPhaseId: TODAY_ID,
      parentPhaseName: "Today",
    });
  });

  it("falls back to parentPhaseName when UUID is missing", () => {
    const result = resolveCreatePhaseParent(
      {
        parentPhaseId: "00000000-0000-4000-8000-000000000099",
        parentPhaseName: "Today",
      },
      phases
    );
    expect(result).toEqual({
      ok: true,
      parentPhaseId: TODAY_ID,
      parentPhaseName: "Today",
    });
  });

  it("returns a root parent when neither id nor name is set", () => {
    expect(resolveCreatePhaseParent({}, phases)).toEqual({
      ok: true,
      parentPhaseId: null,
      parentPhaseName: null,
    });
  });
});

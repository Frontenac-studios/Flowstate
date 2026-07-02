import { describe, expect, it } from "vitest";

import { facetInvitation, inferWinFacet, openFacetsFromSlots, SLOT_FACET } from "./facets";

describe("facets", () => {
  it("maps hero slots to Body · Mind · Soul", () => {
    expect(SLOT_FACET[0]).toBe("physical");
    expect(SLOT_FACET[1]).toBe("mental");
    expect(SLOT_FACET[2]).toBe("spiritual");
  });

  it("infers facets from labels and sources", () => {
    expect(inferWinFacet({ source: "care_event", label: "2 minutes of breathing" })).toBe(
      "spiritual"
    );
    expect(inferWinFacet({ source: "task", label: "Morning walk" })).toBe("physical");
    expect(inferWinFacet({ source: "manual", label: "Shipped the deck" })).toBe("mental");
  });

  it("phrases open facets as invitations", () => {
    expect(facetInvitation("spiritual")).toContain("reflection");
    expect(openFacetsFromSlots([{ id: "1" }, null, null])).toEqual(["mental", "spiritual"]);
  });
});

import { describe, expect, it } from "vitest";

import { buildCreateTaskPlacementSummary } from "./build-create-task-placement-summary";
import { formatCreateTaskPlacementSummary } from "./resolve-create-task-placement";

describe("buildCreateTaskPlacementSummary", () => {
  const inboxLine = formatCreateTaskPlacementSummary({
    category: "adulting",
    projectName: null,
    phaseName: null,
    landing: "inbox",
  });

  it("returns undefined when no tasks were created", () => {
    expect(buildCreateTaskPlacementSummary([], [])).toBeUndefined();
  });

  it("renders a single created task title as a code span plus its placement", () => {
    const summary = buildCreateTaskPlacementSummary(["Pay electric bill"], [inboxLine]);
    expect(summary).toBe(`Added \`Pay electric bill\` · ${inboxLine}`);
  });

  it("appends the shared placement when every created task landed the same way", () => {
    const summary = buildCreateTaskPlacementSummary(
      ["Pay electric bill", "Call landlord"],
      [inboxLine, inboxLine]
    );
    expect(summary).toBe(`Added \`Pay electric bill\`, \`Call landlord\` · ${inboxLine}`);
  });

  it("omits the placement when created tasks landed in different places", () => {
    const projectLine = formatCreateTaskPlacementSummary({
      category: "professional",
      projectName: "Launch",
      phaseName: "Build",
      landing: "inbox",
    });
    const summary = buildCreateTaskPlacementSummary(
      ["Pay electric bill", "Ship beta"],
      [inboxLine, projectLine]
    );
    expect(summary).toBe("Added `Pay electric bill`, `Ship beta`");
  });
});

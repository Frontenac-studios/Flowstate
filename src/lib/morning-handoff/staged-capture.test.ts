import { describe, expect, it } from "vitest";

import { isStagedCaptureId, stagedCapturesFromEdits } from "./staged-capture";

describe("staged-capture", () => {
  it("builds staged rows from create_task edits", () => {
    const rows = stagedCapturesFromEdits([
      {
        itemId: "a",
        title: " Email lease ",
        category: "adulting",
        projectSlug: null,
        priority: 1,
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(isStagedCaptureId(rows[0]!.id)).toBe(true);
    expect(rows[0]!.title).toBe("Email lease");
    expect(rows[0]!.sourceItemId).toBe("a");
    expect(rows[0]!.category).toBe("adulting");
  });
});

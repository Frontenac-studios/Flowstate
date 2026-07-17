import { describe, expect, it } from "vitest";

import { timelineBlockStyle } from "./block-geometry";

describe("timelineBlockStyle", () => {
  it("spans nearly full width for a single column", () => {
    const style = timelineBlockStyle({ col: 0, cols: 1 }, 10, 40);
    expect(style.left).toBe("calc(2.75rem + 0%)");
    expect(style.width).toBe("calc(100% - 2px)");
  });

  it("splits equal columns with a 2px gap", () => {
    const a = timelineBlockStyle({ col: 0, cols: 2 }, 0, 20);
    const b = timelineBlockStyle({ col: 1, cols: 2 }, 0, 20);
    expect(a.width).toBe("calc(50% - 2px)");
    expect(b.left).toBe("calc(2.75rem + 50%)");
  });
});

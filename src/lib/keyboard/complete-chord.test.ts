import { describe, expect, it } from "vitest";

import { isCompleteSelectionChord } from "./complete-chord";

const base = { key: "d", metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };

describe("isCompleteSelectionChord", () => {
  it("matches Cmd+Shift+D", () => {
    expect(isCompleteSelectionChord({ ...base, metaKey: true, shiftKey: true })).toBe(true);
  });

  it("matches Ctrl+Shift+D", () => {
    expect(isCompleteSelectionChord({ ...base, ctrlKey: true, shiftKey: true })).toBe(true);
  });

  it("is case-insensitive on the key", () => {
    expect(isCompleteSelectionChord({ ...base, key: "D", metaKey: true, shiftKey: true })).toBe(
      true
    );
  });

  it("rejects Cmd+D without Shift (the decide-next shortcut)", () => {
    expect(isCompleteSelectionChord({ ...base, metaKey: true })).toBe(false);
  });

  it("rejects when Alt is held", () => {
    expect(isCompleteSelectionChord({ ...base, metaKey: true, shiftKey: true, altKey: true })).toBe(
      false
    );
  });

  it("rejects a bare Shift+D with no modifier", () => {
    expect(isCompleteSelectionChord({ ...base, shiftKey: true })).toBe(false);
  });

  it("rejects other keys", () => {
    expect(isCompleteSelectionChord({ ...base, key: "x", metaKey: true, shiftKey: true })).toBe(
      false
    );
  });
});

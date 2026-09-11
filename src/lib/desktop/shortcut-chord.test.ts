import { describe, expect, it } from "vitest";

import { chordFromEvent, formatChord } from "./shortcut-chord";

const press = (over: Partial<Parameters<typeof chordFromEvent>[0]>) =>
  chordFromEvent({
    key: "k",
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    ...over,
  });

describe("chordFromEvent", () => {
  it("builds the default capture chord", () => {
    expect(press({ key: "k", metaKey: true, shiftKey: true })).toEqual({
      ok: true,
      chord: "CmdOrCtrl+Shift+K",
    });
  });

  it("names the space bar rather than sending a literal space", () => {
    expect(press({ key: " ", altKey: true })).toEqual({ ok: true, chord: "Alt+Space" });
  });

  it("refuses a bare key, which would swallow that character machine-wide", () => {
    expect(press({ key: "k" })).toEqual({ ok: false, reason: "needs-modifier" });
  });

  it("waits for a real key while only modifiers are held", () => {
    expect(press({ key: "Shift", shiftKey: true })).toEqual({ ok: false, reason: "modifier-only" });
  });

  it("drops Control when Command is also held, so the chord isn't doubled up", () => {
    expect(press({ key: "j", metaKey: true, ctrlKey: true })).toEqual({
      ok: true,
      chord: "CmdOrCtrl+J",
    });
  });

  it("rejects keys the parser has no name for", () => {
    expect(press({ key: "F13", metaKey: true })).toEqual({ ok: false, reason: "unsupported-key" });
  });
});

describe("formatChord", () => {
  it("reads as key caps", () => {
    expect(formatChord("CmdOrCtrl+Shift+K")).toBe("⌘⇧K");
    expect(formatChord("Alt+Space")).toBe("⌥Space");
  });
});

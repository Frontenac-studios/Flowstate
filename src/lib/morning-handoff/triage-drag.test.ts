import { describe, expect, it } from "vitest";

import {
  TRIAGE_BIN_DONE_ID,
  TRIAGE_BIN_DROP_ID,
  TRIAGE_BIN_LATER_ID,
  TRIAGE_TODAY_DROP_ID,
  parseTriageDragTaskId,
  resolveTriageDrop,
} from "./triage-drag";

const UUID = "0b9f4c3a-2e1d-4f5b-8a7c-6d5e4f3a2b1c";
const REC_ID = `rec:${UUID}:2026-07-21`;

describe("parseTriageDragTaskId", () => {
  it("round-trips a plain uuid id", () => {
    expect(parseTriageDragTaskId(`triage-task:${UUID}`)).toBe(UUID);
  });

  it("round-trips a recurring occurrence id with embedded colons", () => {
    expect(parseTriageDragTaskId(`triage-task:${REC_ID}`)).toBe(REC_ID);
  });

  it("rejects non-triage ids and empty ids", () => {
    expect(parseTriageDragTaskId(`task:${UUID}`)).toBeNull();
    expect(parseTriageDragTaskId("triage-task:")).toBeNull();
  });
});

describe("resolveTriageDrop", () => {
  it.each([
    [TRIAGE_TODAY_DROP_ID, "today"],
    [TRIAGE_BIN_LATER_ID, "later"],
    [TRIAGE_BIN_DONE_ID, "done"],
    [TRIAGE_BIN_DROP_ID, "drop"],
  ] as const)("maps %s to the %s action", (overId, action) => {
    expect(resolveTriageDrop(`triage-task:${UUID}`, overId)).toEqual({
      taskId: UUID,
      action,
    });
  });

  it("keeps occurrence ids intact through the dispatch", () => {
    expect(resolveTriageDrop(`triage-task:${REC_ID}`, TRIAGE_BIN_DROP_ID)).toEqual({
      taskId: REC_ID,
      action: "drop",
    });
  });

  it("returns null when dropped over nothing or an unknown target", () => {
    expect(resolveTriageDrop(`triage-task:${UUID}`, null)).toBeNull();
    expect(resolveTriageDrop(`triage-task:${UUID}`, "week-inbox")).toBeNull();
  });

  it("returns null for a non-triage active id", () => {
    expect(resolveTriageDrop(`task:${UUID}`, TRIAGE_TODAY_DROP_ID)).toBeNull();
  });
});

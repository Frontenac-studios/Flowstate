import { describe, expect, it } from "vitest";

import {
  MOTION_LONG_MS,
  MOTION_MEDIUM_MS,
  MOTION_MICRO_MS,
  MOTION_SHORT_MS,
  MOTION_TOKEN,
  motionTransition,
  readMotionDurationMs,
} from "./motion-tokens";

describe("motion-tokens", () => {
  it("exports fallbacks matching tokens.css defaults", () => {
    expect(MOTION_MICRO_MS).toBe(90);
    expect(MOTION_SHORT_MS).toBe(160);
    expect(MOTION_MEDIUM_MS).toBe(240);
    expect(MOTION_LONG_MS).toBe(420);
  });

  it("readMotionDurationMs returns fallbacks without document", () => {
    expect(readMotionDurationMs(MOTION_TOKEN.medium)).toBe(MOTION_MEDIUM_MS);
    expect(readMotionDurationMs(MOTION_TOKEN.long)).toBe(MOTION_LONG_MS);
  });

  it("motionTransition references token vars, not raw ms", () => {
    const t = motionTransition(["top", "opacity"]);
    expect(t).toContain("var(--motion-medium)");
    expect(t).toContain("var(--ease-move)");
    expect(t).not.toMatch(/\d+ms/);
  });
});

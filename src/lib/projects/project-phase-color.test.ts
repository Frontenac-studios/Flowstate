import { describe, expect, it } from "vitest";

import { phaseRampColor } from "./project-phase-color";

function parts(color: string): { hue: number; lightness: number } {
  const match = color.match(/^hsl\((\d+) 52% (\d+)%\)$/);
  if (!match) throw new Error(`unexpected color: ${color}`);
  return { hue: Number(match[1]), lightness: Number(match[2]) };
}

describe("phaseRampColor", () => {
  it("returns a neutral marker when there is no project", () => {
    expect(phaseRampColor(null)).toBe("var(--ink-muted)");
    expect(phaseRampColor(null, 2)).toBe("var(--ink-muted)");
  });

  it("gives a project a stable hue regardless of phase ordinal", () => {
    const a = parts(phaseRampColor("project-x", 0));
    const b = parts(phaseRampColor("project-x", 3));
    const c = parts(phaseRampColor("project-x", null));
    expect(a.hue).toBe(b.hue);
    expect(b.hue).toBe(c.hue);
  });

  it("uses the base lightness when the task has no phase", () => {
    expect(parts(phaseRampColor("p", null)).lightness).toBe(56);
  });

  it("ramps darker as phase order increases", () => {
    const l0 = parts(phaseRampColor("p", 0)).lightness;
    const l1 = parts(phaseRampColor("p", 1)).lightness;
    const l2 = parts(phaseRampColor("p", 2)).lightness;
    expect(l0).toBe(64);
    expect(l1).toBeLessThan(l0);
    expect(l2).toBeLessThan(l1);
  });

  it("clamps long projects so later phases don't run off the ramp", () => {
    expect(parts(phaseRampColor("p", 99)).lightness).toBe(34);
  });
});

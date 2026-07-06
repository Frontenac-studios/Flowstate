import { describe, expect, it } from "vitest";

import { parseDurationInput } from "./parse-duration";

describe("parseDurationInput", () => {
  it("parses MM:SS", () => {
    expect(parseDurationInput("25:00")).toBe(25 * 60);
    expect(parseDurationInput("5:30")).toBe(5 * 60 + 30);
  });

  it("rejects invalid input", () => {
    expect(parseDurationInput("")).toBeNull();
    expect(parseDurationInput("5:60")).toBeNull();
    expect(parseDurationInput("abc")).toBeNull();
    expect(parseDurationInput("0:00")).toBeNull();
  });
});

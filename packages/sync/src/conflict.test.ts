import { describe, expect, it } from "vitest";

import { pickNewerRow } from "./conflict";

describe("pickNewerRow", () => {
  it("prefers remote when remote updated_at is newer", () => {
    const local = { updatedAt: new Date("2026-01-01"), createdAt: new Date("2026-01-01") };
    const remote = { updatedAt: new Date("2026-01-02"), createdAt: new Date("2026-01-01") };
    expect(pickNewerRow(local, remote)).toBe("remote");
  });

  it("prefers local when local updated_at is newer", () => {
    const local = { updatedAt: new Date("2026-01-03"), createdAt: new Date("2026-01-01") };
    const remote = { updatedAt: new Date("2026-01-02"), createdAt: new Date("2026-01-01") };
    expect(pickNewerRow(local, remote)).toBe("local");
  });

  it("ties go to remote", () => {
    const t = new Date("2026-01-01");
    expect(pickNewerRow({ updatedAt: t }, { updatedAt: t })).toBe("remote");
  });
});

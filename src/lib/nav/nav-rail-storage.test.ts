import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readNavRailPinned, writeNavRailPinned } from "./nav-rail-storage";

describe("nav rail pinned storage", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to unpinned when nothing is stored", () => {
    expect(readNavRailPinned()).toBe(false);
  });

  it("persists the pinned state and reads it back", () => {
    writeNavRailPinned(true);
    expect(readNavRailPinned()).toBe(true);
  });

  it("removes the key when unpinned", () => {
    writeNavRailPinned(true);
    writeNavRailPinned(false);
    expect(readNavRailPinned()).toBe(false);
    expect(storage.has("kash.nav.railPinned")).toBe(false);
  });

  it("swallows localStorage errors", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("quota");
      },
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {
        throw new Error("quota");
      },
    });

    expect(readNavRailPinned()).toBe(false);
    expect(() => writeNavRailPinned(true)).not.toThrow();
  });
});

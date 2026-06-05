import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { COMPOSER_DRAFT_PREFIX } from "./composer-draft-constants";
import {
  clearComposerDraft,
  composerDraftKey,
  readComposerDraft,
  writeComposerDraft,
} from "./composer-draft-storage";

describe("composerDraftKey", () => {
  it("prefixes scope with kash composer draft namespace", () => {
    expect(composerDraftKey("plan-day")).toBe(`${COMPOSER_DRAFT_PREFIX}plan-day`);
    expect(composerDraftKey("project:abc")).toBe(`${COMPOSER_DRAFT_PREFIX}project:abc`);
  });
});

describe("composer draft storage", () => {
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

  it("reads and writes drafts under the prefixed key", () => {
    expect(readComposerDraft("plan-day")).toBeNull();

    writeComposerDraft("plan-day", "ship onboarding");
    expect(readComposerDraft("plan-day")).toBe("ship onboarding");
    expect(storage.get(composerDraftKey("plan-day"))).toBe("ship onboarding");
  });

  it("clears drafts", () => {
    writeComposerDraft("plan-week", "draft text");
    clearComposerDraft("plan-week");
    expect(readComposerDraft("plan-week")).toBeNull();
    expect(storage.has(composerDraftKey("plan-week"))).toBe(false);
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

    expect(readComposerDraft("plan-day")).toBeNull();
    expect(() => writeComposerDraft("plan-day", "task")).not.toThrow();
    expect(() => clearComposerDraft("plan-day")).not.toThrow();
  });
});

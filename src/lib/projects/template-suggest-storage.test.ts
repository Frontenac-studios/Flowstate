import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  isTemplateSuggestPending,
  queueTemplateSuggest,
  resolveTemplateSuggest,
} from "./template-suggest-storage";

describe("template-suggest-storage", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("queues and resolves a pending project id", () => {
    expect(isTemplateSuggestPending("p1")).toBe(false);
    queueTemplateSuggest("p1");
    expect(isTemplateSuggestPending("p1")).toBe(true);
    resolveTemplateSuggest("p1");
    expect(isTemplateSuggestPending("p1")).toBe(false);
  });

  it("is idempotent when queueing the same project twice", () => {
    queueTemplateSuggest("p1");
    queueTemplateSuggest("p1");
    expect(isTemplateSuggestPending("p1")).toBe(true);
  });
});

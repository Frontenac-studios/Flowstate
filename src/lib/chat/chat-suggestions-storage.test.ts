import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getSortedSuggestions,
  mergeAndSortSuggestions,
  recordSuggestionUsage,
  resetSuggestionUsageForTests,
} from "./chat-suggestions-storage";

describe("chat-suggestions-storage", () => {
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
    resetSuggestionUsageForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns built-in suggestions in default order", () => {
    const sorted = getSortedSuggestions();
    expect(sorted[0]?.id).toBe("work_on");
  });

  it("sorts by usage count descending", () => {
    recordSuggestionUsage("work_on");
    recordSuggestionUsage("work_on");
    const sorted = getSortedSuggestions();
    expect(sorted[0]?.id).toBe("work_on");
  });

  it("merges custom suggestions and sorts by combined usage", () => {
    recordSuggestionUsage("work_on");
    const custom = [
      {
        id: "custom-1",
        label: "Summarize my week",
        kind: "freeform" as const,
        userText: "Summarize my week",
        source: "custom" as const,
      },
    ];
    const sorted = mergeAndSortSuggestions(
      [
        {
          id: "work_on",
          label: "Work on",
          kind: "work_on",
          userText: "Work on",
          source: "builtin",
        },
      ],
      custom,
      { work_on: 1 },
      { "custom-1": 5 }
    );
    expect(sorted[0]?.id).toBe("custom-1");
    expect(sorted[1]?.id).toBe("work_on");
  });
});

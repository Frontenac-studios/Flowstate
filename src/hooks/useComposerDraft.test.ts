import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { composerDraftKey } from "@/lib/composer/composer-draft-storage";

import { useComposerDraft } from "./useComposerDraft";

describe("useComposerDraft", () => {
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

  it("restores a saved draft on mount", () => {
    storage.set(composerDraftKey("plan-day"), "saved task");

    const { result } = renderHook(() => useComposerDraft("plan-day"));

    expect(result.current[0]).toBe("saved task");
  });

  it("persists value changes after restore", () => {
    const { result } = renderHook(() => useComposerDraft("plan-day"));

    act(() => {
      result.current[1]("new draft");
    });

    expect(storage.get(composerDraftKey("plan-day"))).toBe("new draft");
  });

  it("clears storage when value becomes empty", () => {
    storage.set(composerDraftKey("plan-day"), "old draft");

    const { result } = renderHook(() => useComposerDraft("plan-day"));

    act(() => {
      result.current[1]("");
    });

    expect(result.current[0]).toBe("");
    expect(storage.has(composerDraftKey("plan-day"))).toBe(false);
  });

  it("clears storage when value is whitespace only", () => {
    storage.set(composerDraftKey("plan-day"), "old draft");

    const { result } = renderHook(() => useComposerDraft("plan-day"));

    act(() => {
      result.current[1]("   \n  ");
    });

    expect(storage.has(composerDraftKey("plan-day"))).toBe(false);
  });

  it("re-restores when storageKey changes", () => {
    storage.set(composerDraftKey("plan-day"), "today draft");
    storage.set(composerDraftKey("plan-week"), "week draft");

    const { result, rerender } = renderHook(({ key }) => useComposerDraft(key), {
      initialProps: { key: "plan-day" },
    });

    expect(result.current[0]).toBe("today draft");

    rerender({ key: "plan-week" });

    expect(result.current[0]).toBe("week draft");
  });
});

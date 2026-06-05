import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { useRdmNarration } from "./useRdmNarration";

describe("useRdmNarration", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ narration: "Claude picked this one." }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches narration once for a stable task", async () => {
    const task = {
      id: "task-1",
      title: "Ship focus mode",
      isTop3: true,
      priority: 2,
      projectSlug: "kash",
    };

    const { result, rerender } = renderHook(() => useRdmNarration(task));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.narration).toBe("Claude picked this one.");
    expect(fetch).toHaveBeenCalledTimes(1);

    rerender();

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("clears narration when task becomes null", async () => {
    type TaskForNarration = {
      id: string;
      title: string;
      isTop3: boolean;
      priority: number;
      projectSlug: string | null;
    };

    const task: TaskForNarration = {
      id: "task-1",
      title: "Ship focus mode",
      isTop3: false,
      priority: 0,
      projectSlug: null,
    };

    const { result, rerender } = renderHook(({ current }) => useRdmNarration(current), {
      initialProps: { current: task as TaskForNarration | null },
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    rerender({ current: null });

    expect(result.current.narration).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});

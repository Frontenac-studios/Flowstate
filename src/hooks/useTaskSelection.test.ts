import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useTaskSelection } from "./useTaskSelection";

describe("useTaskSelection", () => {
  it("selects and clears a task", () => {
    const { result } = renderHook(({ ids }) => useTaskSelection(ids), {
      initialProps: { ids: ["a", "b", "c"] },
    });

    expect(result.current.selectedTaskId).toBeNull();

    act(() => result.current.select("b"));
    expect(result.current.selectedTaskId).toBe("b");

    act(() => result.current.clear());
    expect(result.current.selectedTaskId).toBeNull();
  });

  it("auto-clears the selection when the task leaves the visible set", () => {
    const { result, rerender } = renderHook(({ ids }) => useTaskSelection(ids), {
      initialProps: { ids: ["a", "b", "c"] },
    });

    act(() => result.current.select("b"));
    expect(result.current.selectedTaskId).toBe("b");

    // "b" completed / moved off-surface → drops out of the visible set.
    rerender({ ids: ["a", "c"] });
    expect(result.current.selectedTaskId).toBeNull();
  });

  it("keeps the selection when the visible set still contains it", () => {
    const { result, rerender } = renderHook(({ ids }) => useTaskSelection(ids), {
      initialProps: { ids: ["a", "b", "c"] },
    });

    act(() => result.current.select("b"));
    rerender({ ids: ["b", "c", "d"] });
    expect(result.current.selectedTaskId).toBe("b");
  });
});

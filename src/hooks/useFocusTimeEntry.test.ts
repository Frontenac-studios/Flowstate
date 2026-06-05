import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useFocusTimeEntry } from "./useFocusTimeEntry";

describe("useFocusTimeEntry", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts a time entry once per taskId across re-renders", async () => {
    const startTimeEntry = vi.fn().mockResolvedValue({ entryId: "entry-1" });

    const { rerender } = renderHook(
      ({ taskId }) =>
        useFocusTimeEntry({
          taskId,
          startTimeEntry,
        }),
      { initialProps: { taskId: "task-a" } }
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(startTimeEntry).toHaveBeenCalledTimes(1);
    expect(startTimeEntry).toHaveBeenCalledWith({ taskId: "task-a" });

    rerender({ taskId: "task-a" });

    await act(async () => {
      await Promise.resolve();
    });

    expect(startTimeEntry).toHaveBeenCalledTimes(1);
  });

  it("starts again when taskId changes", async () => {
    const startTimeEntry = vi
      .fn()
      .mockResolvedValueOnce({ entryId: "entry-1" })
      .mockResolvedValueOnce({ entryId: "entry-2" });

    const { result, rerender } = renderHook(
      ({ taskId }) =>
        useFocusTimeEntry({
          taskId,
          startTimeEntry,
        }),
      { initialProps: { taskId: "task-a" } }
    );

    await act(async () => {
      await Promise.resolve();
    });

    rerender({ taskId: "task-b" });

    await act(async () => {
      await Promise.resolve();
    });

    expect(startTimeEntry).toHaveBeenCalledTimes(2);
    expect(startTimeEntry).toHaveBeenNthCalledWith(1, { taskId: "task-a" });
    expect(startTimeEntry).toHaveBeenNthCalledWith(2, { taskId: "task-b" });
    expect(result.current.current).toBe("entry-2");
  });

  it("calls onSessionStart when a new task session begins", async () => {
    const startTimeEntry = vi.fn().mockResolvedValue({ entryId: "entry-1" });
    const onSessionStart = vi.fn();

    renderHook(() =>
      useFocusTimeEntry({
        taskId: "task-a",
        startTimeEntry,
        onSessionStart,
      })
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(onSessionStart).toHaveBeenCalledTimes(1);
  });
});

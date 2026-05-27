import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useLocalCalendarClock, useLocalCalendarDate } from "./useLocalCalendarDate";

describe("useLocalCalendarDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 26, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates localDate after midnight", () => {
    const { result } = renderHook(() => useLocalCalendarDate());
    expect(result.current).toBe("2026-05-26");

    act(() => {
      vi.setSystemTime(new Date(2026, 4, 27, 0, 5, 0));
      vi.advanceTimersByTime(60_000);
    });

    expect(result.current).toBe("2026-05-27");
  });

  it("useLocalCalendarClock refreshes now when the day changes", () => {
    const { result } = renderHook(() => useLocalCalendarClock());
    const before = result.current.now.getTime();

    act(() => {
      vi.setSystemTime(new Date(2026, 4, 27, 1, 0, 0));
      vi.advanceTimersByTime(60_000);
    });

    expect(result.current.localDate).toBe("2026-05-27");
    expect(result.current.now.getTime()).toBeGreaterThan(before);
  });
});

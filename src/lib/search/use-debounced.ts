"use client";

import { useEffect, useState } from "react";

/**
 * Hold a value still for `delayMs` after the last change.
 *
 * Search runs on every keystroke, and a query per keystroke is both wasted work
 * and a list that flickers while you are still typing. 140ms is under the
 * threshold where a person notices a pause, and long enough that a normal
 * typing burst produces one query rather than nine.
 */
export function useDebounced<T>(value: T, delayMs = 140): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => setSettled(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);

  return settled;
}

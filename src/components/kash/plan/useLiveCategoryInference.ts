"use client";

import { useEffect, useState } from "react";

import { inferCategory } from "@/lib/tasks/category-inference";
import { type CategoryInference } from "@/lib/tasks/resolveTaskCategory";

// 1.AIa: live, per-keystroke category inference for the composer accent bar. Debounced
// ~150ms and de-duped by the embedding cache, so the local model updates the guess as you
// type without blocking input. `enabled` lets the caller skip inference when an explicit
// or project value already decides the category (mirrors the server's needsInference).
const DEBOUNCE_MS = 150;

export function useLiveCategoryInference(
  title: string,
  enabled: boolean
): CategoryInference | null {
  const [inference, setInference] = useState<CategoryInference | null>(null);

  useEffect(() => {
    if (!enabled || !title.trim()) {
      setInference(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      void inferCategory(title).then((result) => {
        if (!cancelled) setInference(result);
      });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [title, enabled]);

  return inference;
}

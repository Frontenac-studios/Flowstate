"use client";

import { useEffect } from "react";

import {
  applySpacingVariant,
  isSpacingPreviewActive,
  readSpacingVariant,
} from "@/lib/desktop/spacing-variant";
import { isDesktopRuntime } from "@/lib/runtime/is-desktop";

/**
 * Restores persisted desktop spacing variant (dev preview) and ensures
 * `is-desktop` is set when previewing outside Tauri.
 */
export function SpacingVariantInit({ forceDesktop = false }: { forceDesktop?: boolean }) {
  useEffect(() => {
    const useDesktopSpacing = forceDesktop || isDesktopRuntime() || isSpacingPreviewActive();
    if (useDesktopSpacing) {
      document.documentElement.classList.add("is-desktop");
    }
    if (process.env.NODE_ENV === "development") {
      applySpacingVariant(readSpacingVariant());
    }
  }, [forceDesktop]);

  return null;
}

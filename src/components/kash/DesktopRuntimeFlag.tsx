"use client";

import { useEffect } from "react";

import { isDesktopRuntime } from "@/lib/runtime/is-desktop";

/**
 * On mount, marks `<html>` with `is-desktop` when running in the Tauri
 * runtime. The `is-desktop` class is keyed by CSS to hide the gradient
 * backdrop (so the native macOS NSView vibrancy material shows the desktop
 * wallpaper) and can be used by other surfaces that want desktop-only
 * styling.
 *
 * Renders nothing. Side-effect only.
 */
export function DesktopRuntimeFlag() {
  useEffect(() => {
    if (isDesktopRuntime()) {
      document.documentElement.classList.add("is-desktop");
    }
  }, []);

  return null;
}

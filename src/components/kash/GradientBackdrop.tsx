"use client";

import { useEffect, useState } from "react";

import { isDesktopRuntime } from "@/lib/runtime/is-desktop";

/**
 * Renders the animated gradient backdrop on the web. On the Tauri desktop
 * runtime, returns null so the native macOS window vibrancy (HUD material
 * applied in lib.rs) shows the desktop wallpaper through the glass.
 */
export function GradientBackdrop() {
  const [hide, setHide] = useState(false);

  useEffect(() => {
    if (isDesktopRuntime()) setHide(true);
  }, []);

  if (hide) return null;
  return <div className="kash-gradient-bg pointer-events-none fixed inset-0 z-0" aria-hidden />;
}

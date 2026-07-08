"use client";

import { useEffect } from "react";

import { useDesktopFullscreen } from "@/hooks/useDesktopFullscreen";

/**
 * Toggles `is-fullscreen` on `<html>` when the Kash desktop window enters
 * native fullscreen. CSS and layout components key off this class.
 */
export function DesktopFullscreenFlag() {
  const isFullscreen = useDesktopFullscreen();

  useEffect(() => {
    document.documentElement.classList.toggle("is-fullscreen", isFullscreen);
    return () => {
      document.documentElement.classList.remove("is-fullscreen");
    };
  }, [isFullscreen]);

  return null;
}

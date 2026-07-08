"use client";

import { useEffect, useState } from "react";

import { subscribeDesktopFullscreen } from "@/lib/runtime/tauri-window";

/** Tracks native fullscreen for the Kash desktop window. Always false on web. */
export function useDesktopFullscreen(): boolean {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => subscribeDesktopFullscreen(setIsFullscreen), []);

  return isFullscreen;
}

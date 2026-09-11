"use client";

import { useEffect } from "react";

import { enableCaptureShortcut } from "@/lib/desktop/capture-bridge";
import { FLAGS } from "@/lib/flags";

/**
 * Desktop-only glue for the capture panel (W17). The shell loads the stored
 * shortcut at launch but never registers it by itself — the capture flag lives
 * in the web build, so the web app is what turns the system-wide hotkey on.
 * Mounted once in the app shell; renders nothing, and a no-op off the desktop.
 */
export default function DesktopCaptureBridge() {
  useEffect(() => {
    if (FLAGS.capturePanel) void enableCaptureShortcut();
  }, []);

  return null;
}

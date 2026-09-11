"use client";

import { isDesktopRuntime } from "@/lib/runtime/is-desktop";

/**
 * Web ↔ native bridge for the global capture panel (W17).
 *
 * The shell owns the OS-level shortcut and the panel window; the web app owns
 * what the panel shows and what a captured line becomes. This module is the
 * seam. Every export is a no-op off the desktop runtime, so callers never
 * branch on platform — the same components render in a browser tab, they just
 * can't hide a window that doesn't exist.
 */

type TauriInvoke = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
type TauriListen = <T>(
  event: string,
  handler: (event: { payload: T }) => void
) => Promise<() => void>;

type TauriGlobal = {
  invoke?: TauriInvoke;
  core?: { invoke?: TauriInvoke };
  event?: { listen?: TauriListen };
};

function tauriGlobal(): TauriGlobal | null {
  if (typeof window === "undefined" || !isDesktopRuntime()) return null;
  return (window as Window & { __TAURI__?: TauriGlobal }).__TAURI__ ?? null;
}

function tauriInvoke(): TauriInvoke | null {
  const tauri = tauriGlobal();
  const invoke = tauri?.core?.invoke ?? tauri?.invoke;
  return typeof invoke === "function" ? invoke : null;
}

export type CaptureShortcutStatus = {
  /** The chord as macOS has it, e.g. "CmdOrCtrl+Shift+K". */
  shortcut: string;
  /** Why registration failed, in words a person can act on. Null when it worked. */
  error: string | null;
  /** Whether Kash launches at login — the hotkey's twin. */
  autostart: boolean;
};

/** Read the live shortcut, any registration failure, and the autostart state. */
export async function readCaptureShortcutStatus(): Promise<CaptureShortcutStatus | null> {
  const invoke = tauriInvoke();
  if (!invoke) return null;
  try {
    return (await invoke("capture_shortcut_status")) as CaptureShortcutStatus;
  } catch {
    // An older shell without the command. Settings hides the section.
    return null;
  }
}

/**
 * Ask the shell to register the stored capture shortcut. The shell never takes
 * a system-wide chord on its own — it waits for this, so the hotkey exists only
 * in builds where the capture flag is on. Safe to call on every load; a failure
 * (the chord is taken) is recorded by the shell and shown in Settings.
 */
export async function enableCaptureShortcut(): Promise<void> {
  const invoke = tauriInvoke();
  if (!invoke) return;
  try {
    await invoke("enable_capture_shortcut");
  } catch {
    // Taken by another app, or an older shell without the command. Settings
    // reads the recorded failure from `capture_shortcut_status`.
  }
}

/**
 * Rebind the capture shortcut. Rejects with the shell's message when the chord
 * is taken, and the previous binding is left working.
 */
export async function writeCaptureShortcut(shortcut: string): Promise<void> {
  const invoke = tauriInvoke();
  if (!invoke) return;
  await invoke("set_capture_shortcut", { shortcut });
}

/** Turn launch-at-login on or off. */
export async function writeAutostart(enabled: boolean): Promise<void> {
  const invoke = tauriInvoke();
  if (!invoke) return;
  await invoke("set_autostart", { enabled });
}

/** Dismiss the panel and hand focus back to the app the user was in. */
export function hideCapturePanel(): void {
  const invoke = tauriInvoke();
  if (!invoke) return;
  void invoke("hide_capture_panel");
}

/** Grow or shrink the panel window to match its content height. */
export function resizeCapturePanel(height: number): void {
  const invoke = tauriInvoke();
  if (!invoke) return;
  void invoke("resize_capture_panel", { height: Math.ceil(height) });
}

/**
 * Bring the main window forward at an app-relative path. The one place capture
 * is allowed to interrupt: the user picked a result and asked to go to it.
 */
export function openInMainWindow(path: string): void {
  const invoke = tauriInvoke();
  if (!invoke) return;
  void invoke("open_in_main", { path });
}

/**
 * The panel is shown and hidden, never remounted, so nothing resets the field
 * between opens. The shell emits this on every open and the panel clears itself.
 */
export function subscribeCaptureOpened(handler: () => void): () => void {
  const listen = tauriGlobal()?.event?.listen;
  if (typeof listen !== "function") return () => {};

  let cancelled = false;
  let unlisten: (() => void) | undefined;

  void listen<unknown>("capture-opened", () => {
    if (!cancelled) handler();
  }).then((fn) => {
    if (cancelled) fn();
    else unlisten = fn;
  });

  return () => {
    cancelled = true;
    unlisten?.();
  };
}

"use client";

import { isDesktopRuntime } from "@/lib/runtime/is-desktop";

/**
 * Web ↔ native bridge for the menu-bar timer (W2f). The timer's truth lives in
 * the app (tRPC + DB); the tray only mirrors it and asks for start/stop/switch.
 * So the app pushes state down with `set_timer_tray`, and the shell pushes two
 * kinds of request back up as Tauri events: `tray-command` (the user clicked
 * Stop or a Switch target) and `idle-return` (the machine was idle past the
 * threshold and input just resumed). Every export degrades to a no-op off the
 * desktop runtime, so callers never branch on platform.
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

export type TrayTimerState = {
  projectName: string;
  /** Start instant in epoch ms; the shell ticks elapsed from this itself. */
  startedAtMs: number;
} | null;

export type TrayProject = { id: string; name: string };

/**
 * Push the running timer (or null when stopped) and the switch/start targets to
 * the native menu-bar timer. Called on every timer or project-list change.
 */
export async function pushTimerTray(
  running: TrayTimerState,
  recentProjects: TrayProject[]
): Promise<void> {
  const invoke = tauriInvoke();
  if (!invoke) return;
  try {
    await invoke("set_timer_tray", { running, recentProjects });
  } catch {
    // The shell may be an older build without the command; the in-app timer stands.
  }
}

export type TrayCommand = { action: "stop" } | { action: "start"; projectId: string };

function subscribe<T>(eventName: string, handler: (payload: T) => void): () => void {
  const listen = tauriGlobal()?.event?.listen;
  if (typeof listen !== "function") return () => {};

  let cancelled = false;
  let unlisten: (() => void) | undefined;

  void listen<T>(eventName, (event) => {
    if (!cancelled) handler(event.payload);
  }).then((fn) => {
    if (cancelled) fn();
    else unlisten = fn;
  });

  return () => {
    cancelled = true;
    unlisten?.();
  };
}

/** Subscribe to Stop / Switch clicks from the menu-bar timer. */
export function subscribeTrayCommands(handler: (command: TrayCommand) => void): () => void {
  return subscribe<TrayCommand>("tray-command", handler);
}

export type IdleReturn = { awaySeconds: number };

/** Subscribe to "the machine was idle, and you're back" from the shell. */
export function subscribeIdleReturn(handler: (event: IdleReturn) => void): () => void {
  return subscribe<IdleReturn>("idle-return", handler);
}

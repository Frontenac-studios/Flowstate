"use client";

import { isDesktopRuntime } from "@/lib/runtime/is-desktop";

/**
 * OS-notification delivery (W2d), cross-platform:
 * - Web build: the Web Notifications API, which reaches the system notification
 *   centre while the page is alive (even backgrounded).
 * - Desktop build: tauri-plugin-notification, invoked the same raw way the app
 *   already calls Tauri commands (macOS WKWebView has no Web Notification API).
 *
 * Every call degrades to a no-op when neither backend is available or permission
 * is not granted, so callers never branch on platform — they pair this with an
 * in-app visual signal for the cases it can't cover.
 */

type TauriInvoke = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;

function tauriInvoke(): TauriInvoke | null {
  if (typeof window === "undefined") return null;
  const tauri = (
    window as Window & {
      __TAURI__?: { invoke?: TauriInvoke; core?: { invoke?: TauriInvoke } };
    }
  ).__TAURI__;
  const invoke = tauri?.core?.invoke ?? tauri?.invoke;
  return typeof invoke === "function" ? invoke : null;
}

export function canNotify(): boolean {
  if (typeof window === "undefined") return false;
  if (isDesktopRuntime()) return tauriInvoke() != null;
  return "Notification" in window;
}

/** Request permission if it hasn't been granted yet. Returns whether it is granted. */
export async function ensureNotifyPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (isDesktopRuntime()) {
    const invoke = tauriInvoke();
    if (!invoke) return false;
    try {
      if ((await invoke("plugin:notification|is_permission_granted")) === true) return true;
      return (await invoke("plugin:notification|request_permission")) === "granted";
    } catch {
      return false;
    }
  }

  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    return (await Notification.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

/**
 * Show a notification if allowed. `tag` collapses repeats of the same alert (the
 * OS replaces a same-tag notification rather than stacking). Returns whether one
 * was shown, so a caller can fall back to an in-app signal.
 */
export async function showNotification(params: {
  title: string;
  body?: string;
  tag?: string;
}): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (isDesktopRuntime()) {
    const invoke = tauriInvoke();
    if (!invoke) return false;
    try {
      if (!(await ensureNotifyPermission())) return false;
      await invoke("plugin:notification|notify", {
        options: { title: params.title, body: params.body },
      });
      return true;
    } catch {
      return false;
    }
  }

  if (!("Notification" in window) || Notification.permission !== "granted") return false;
  try {
    new Notification(params.title, { body: params.body, tag: params.tag });
    return true;
  } catch {
    return false;
  }
}

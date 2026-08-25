"use client";

/**
 * Minimal OS-notification delivery for the web build (W2d). Uses the Web
 * Notifications API, which reaches the system notification centre while the page
 * is alive — even backgrounded — so a forgotten timer can find you.
 *
 * The desktop app runs in a macOS WKWebView, which does NOT implement the Web
 * Notification API; native desktop delivery (tauri-plugin-notification) is a
 * follow-up. Here every call degrades to a no-op when Notification is absent or
 * permission is not granted, so callers never need to branch on the platform —
 * they pair this with an in-app visual signal for the cases it can't cover.
 */

export function canNotify(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Request permission if it hasn't been decided yet. Safe to call repeatedly. */
export async function ensureNotifyPermission(): Promise<NotificationPermission> {
  if (!canNotify()) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

/**
 * Show a notification if allowed. `tag` collapses repeats of the same alert
 * (the OS replaces a same-tag notification rather than stacking). Returns whether
 * one was actually shown, so a caller can fall back to an in-app signal.
 */
export function showNotification(params: { title: string; body?: string; tag?: string }): boolean {
  if (!canNotify() || Notification.permission !== "granted") return false;
  try {
    new Notification(params.title, { body: params.body, tag: params.tag });
    return true;
  } catch {
    return false;
  }
}

type TauriInvoke = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
type TauriWindow = Window & { __TAURI__?: { invoke?: TauriInvoke } };

function tauriInvoke(): TauriInvoke | null {
  if (typeof window === "undefined") return null;
  const invoke = (window as TauriWindow).__TAURI__?.invoke;
  return typeof invoke === "function" ? invoke : null;
}

/** Toggle macOS Do Not Disturb when the Tauri shell supports it (DND-1). */
export async function setOsDoNotDisturb(enabled: boolean): Promise<boolean> {
  const invoke = tauriInvoke();
  if (!invoke) return false;
  try {
    return Boolean(await invoke("set_do_not_disturb", { enabled }));
  } catch {
    return false;
  }
}

export async function isOsDoNotDisturbSupported(): Promise<boolean> {
  const invoke = tauriInvoke();
  if (!invoke) return false;
  try {
    return Boolean(await invoke("do_not_disturb_supported"));
  } catch {
    return false;
  }
}

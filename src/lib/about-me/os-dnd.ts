type TauriInvoke = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
type TauriWindow = Window & { __TAURI__?: { invoke?: TauriInvoke } };
function tauriInvoke(): TauriInvoke | null {
  if (typeof window === "undefined") return null;
  const invoke = (window as TauriWindow).__TAURI__?.invoke;
  return typeof invoke === "function" ? invoke : null;
}
export function setOsDoNotDisturb(enabled: boolean): void {
  const invoke = tauriInvoke();
  if (!invoke) return;
  void invoke("set_do_not_disturb", { enabled }).catch(() => {});
}

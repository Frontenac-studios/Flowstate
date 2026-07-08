import { isDesktopRuntime } from "@/lib/runtime/is-desktop";

type TauriInvoke = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;

type TauriWebviewWindow = {
  isFullscreen: () => Promise<boolean>;
  onResized: (handler: () => void) => Promise<() => void>;
};

type TauriGlobal = {
  invoke?: TauriInvoke;
  core?: { invoke?: TauriInvoke };
  window?: {
    getCurrentWindow?: () => TauriWebviewWindow;
  };
};

function tauriGlobal(): TauriGlobal | null {
  if (typeof window === "undefined" || !isDesktopRuntime()) return null;
  return (window as Window & { __TAURI__?: TauriGlobal }).__TAURI__ ?? null;
}

function tauriInvoke(): TauriInvoke | null {
  const tauri = tauriGlobal();
  if (!tauri) return null;
  const invoke = tauri.core?.invoke ?? tauri.invoke;
  return typeof invoke === "function" ? invoke : null;
}

function getTauriWindow(): TauriWebviewWindow | null {
  const getCurrentWindow = tauriGlobal()?.window?.getCurrentWindow;
  return typeof getCurrentWindow === "function" ? getCurrentWindow() : null;
}

/** True when the Kash desktop window is in native fullscreen. */
export async function readDesktopFullscreen(): Promise<boolean> {
  const win = getTauriWindow();
  if (win) {
    try {
      return await win.isFullscreen();
    } catch {
      // Fall through to invoke.
    }
  }

  const invoke = tauriInvoke();
  if (!invoke) return false;
  try {
    return Boolean(await invoke("plugin:window|is_fullscreen"));
  } catch {
    return false;
  }
}

/** Subscribe to desktop fullscreen changes. Returns an unsubscribe function. */
export function subscribeDesktopFullscreen(onChange: (fullscreen: boolean) => void): () => void {
  if (!isDesktopRuntime()) return () => {};

  let cancelled = false;
  let unlistenResize: (() => void) | undefined;

  const sync = () => {
    void readDesktopFullscreen().then((fullscreen) => {
      if (!cancelled) onChange(fullscreen);
    });
  };

  sync();

  const win = getTauriWindow();
  if (win) {
    void win.onResized(sync).then((unlisten) => {
      if (cancelled) {
        unlisten();
      } else {
        unlistenResize = unlisten;
      }
    });
  } else {
    window.addEventListener("resize", sync);
    unlistenResize = () => window.removeEventListener("resize", sync);
  }

  return () => {
    cancelled = true;
    unlistenResize?.();
  };
}

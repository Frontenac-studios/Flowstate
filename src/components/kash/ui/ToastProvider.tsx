"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import Toast, { type ToastVariant } from "./Toast";

const AUTO_DISMISS_MS = 5000;
const EXIT_MS = 160;

export type ToastInput = {
  message: ReactNode;
  variant?: ToastVariant;
  duration?: number;
  action?: { label: string; onClick: () => void };
};

type ToastRecord = ToastInput & { id: string; exiting: boolean };

type ToastContextValue = {
  toast: (input: ToastInput) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

/**
 * Toast accessor that returns `null` instead of throwing when no provider is
 * mounted (e.g. the `/today/focus` route, which has no ToastProvider). Callers
 * that may render both inside and outside the shell should use this and no-op
 * when it's null.
 */
export function useOptionalToast(): ToastContextValue | null {
  return useContext(ToastContext);
}

let toastCounter = 0;

function nextToastId(): string {
  toastCounter += 1;
  return `toast-${toastCounter}`;
}

type ProviderProps = {
  children: ReactNode;
};

export default function ToastProvider({ children }: ProviderProps) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  /** Portal targets `document.body`; defer until after hydration. */
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, EXIT_MS);
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = nextToastId();
      const duration = input.duration ?? AUTO_DISMISS_MS;
      setToasts((prev) => [...prev, { ...input, id, exiting: false }]);
      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted
        ? createPortal(
            <div
              className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--space-5)+var(--mobile-nav-clearance))] z-toast flex flex-col items-center gap-[var(--space-2)] px-[var(--space-4)] lg:bottom-[var(--space-5)]"
              aria-live="polite"
            >
              {toasts.map((t) => (
                <div key={t.id} className="pointer-events-auto w-full max-w-md">
                  <Toast
                    id={t.id}
                    message={t.message}
                    variant={t.variant}
                    exiting={t.exiting}
                    action={t.action}
                    onDismiss={() => dismiss(t.id)}
                  />
                </div>
              ))}
            </div>,
            document.body
          )
        : null}
    </ToastContext.Provider>
  );
}

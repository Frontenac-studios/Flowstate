"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { isEditableTarget } from "@/lib/keyboard/is-editable-target";

import { OPEN_ABYSS_CAPTURE_EVENT, OPEN_PALETTE_EVENT } from "./chrome-events";
import { useChat } from "./chat/ChatProvider";

const CommandPalette = dynamic(() =>
  import("./CommandPalette").then((m) => ({ default: m.CommandPalette }))
);
const AbyssQuickCapture = dynamic(() => import("./abyss/AbyssQuickCapture"));
const ChatRail = dynamic(() => import("./chat/ChatRail").then((m) => ({ default: m.ChatRail })));

const overlayImports = () =>
  Promise.all([import("./CommandPalette"), import("./abyss/AbyssQuickCapture")]);

function scheduleIdle(callback: () => void): number {
  if (typeof window.requestIdleCallback === "function") {
    return window.requestIdleCallback(callback);
  }
  return window.setTimeout(callback, 0);
}

function cancelIdle(id: number): void {
  if (typeof window.cancelIdleCallback === "function") {
    window.cancelIdleCallback(id);
  } else {
    window.clearTimeout(id);
  }
}

type PendingOverlay = {
  palette: boolean;
  abyss: boolean;
};

/**
 * Right-column chat rail. Chunk loads on first open; Phase 1.1 gates queries behind
 * `railOpen` so mounting the shell does not fetch chat data while collapsed.
 */
export function AppShellChatRail() {
  const { railOpen, ritualOpen } = useChat();
  if (!railOpen || ritualOpen) return null;
  return <ChatRail />;
}

/**
 * Global modals (command palette, Abyss quick capture). Deferred until
 * `requestIdleCallback`; keyboard and header triggers preload immediately.
 */
export function AppShellFixedOverlays() {
  const [mounted, setMounted] = useState(false);
  const mountedRef = useRef(false);
  const pendingRef = useRef<PendingOverlay>({ palette: false, abyss: false });

  useEffect(() => {
    mountedRef.current = mounted;
  }, [mounted]);

  const preload = () => {
    void overlayImports().then(() => setMounted(true));
  };

  useEffect(() => {
    if (!mounted) return;
    const { palette, abyss } = pendingRef.current;
    pendingRef.current = { palette: false, abyss: false };
    if (palette) window.dispatchEvent(new CustomEvent(OPEN_PALETTE_EVENT));
    if (abyss) window.dispatchEvent(new CustomEvent(OPEN_ABYSS_CAPTURE_EVENT));
  }, [mounted]);

  useEffect(() => {
    const idleId = scheduleIdle(() => {
      void overlayImports().then(() => setMounted(true));
    });
    return () => cancelIdle(idleId);
  }, []);

  useEffect(() => {
    const onOpenPalette = () => {
      if (mountedRef.current) return;
      pendingRef.current.palette = true;
      preload();
    };
    const onOpenAbyss = () => {
      if (mountedRef.current) return;
      pendingRef.current.abyss = true;
      preload();
    };
    window.addEventListener(OPEN_PALETTE_EVENT, onOpenPalette);
    window.addEventListener(OPEN_ABYSS_CAPTURE_EVENT, onOpenAbyss);
    return () => {
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpenPalette);
      window.removeEventListener(OPEN_ABYSS_CAPTURE_EVENT, onOpenAbyss);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (mountedRef.current) return;
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;

      if (e.key.toLowerCase() === "k") {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        pendingRef.current.palette = true;
        preload();
        return;
      }

      if (e.shiftKey && e.key.toLowerCase() === "a") {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        pendingRef.current.abyss = true;
        preload();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <CommandPalette />
      <AbyssQuickCapture />
    </>
  );
}

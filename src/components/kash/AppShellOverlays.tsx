"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { isEditableTarget } from "@/lib/keyboard/is-editable-target";

import {
  OPEN_ABYSS_CAPTURE_EVENT,
  OPEN_NEW_PROJECT_EVENT,
  OPEN_PALETTE_EVENT,
} from "./chrome-events";
import { useChat } from "./chat/ChatProvider";
import { FLAGS } from "@/lib/flags";

const CommandPalette = dynamic(() =>
  import("./CommandPalette").then((m) => ({ default: m.CommandPalette }))
);
const AbyssQuickCapture = dynamic(() => import("./abyss/AbyssQuickCapture"));
const NewProjectOverlay = dynamic(() => import("./projects/NewProjectOverlay"));
const ChatRail = dynamic(() => import("./chat/ChatRail").then((m) => ({ default: m.ChatRail })));

const overlayImports = () =>
  Promise.all([
    import("./CommandPalette"),
    import("./abyss/AbyssQuickCapture"),
    import("./projects/NewProjectOverlay"),
  ]);

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
  newProject: boolean;
};

/**
 * Right-column chat rail. Chunk loads on first open; Phase 1.1 gates queries behind
 * `railOpen` so mounting the shell does not fetch chat data while collapsed.
 */
export function AppShellChatRail() {
  const { railOpen, ritualOpen } = useChat();
  // Chat parked (docs/v1-scope.md §3.2). ChatProvider still wraps the shell so
  // the context exists for the components that read it, but nothing can open
  // the rail and the chunk is never fetched.
  if (!FLAGS.chat) return null;
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
  const pendingRef = useRef<PendingOverlay>({ palette: false, abyss: false, newProject: false });

  useEffect(() => {
    mountedRef.current = mounted;
  }, [mounted]);

  const preload = () => {
    void overlayImports().then(() => setMounted(true));
  };

  useEffect(() => {
    if (!mounted) return;
    const { palette, abyss, newProject } = pendingRef.current;
    pendingRef.current = { palette: false, abyss: false, newProject: false };
    if (palette) window.dispatchEvent(new CustomEvent(OPEN_PALETTE_EVENT));
    if (abyss) window.dispatchEvent(new CustomEvent(OPEN_ABYSS_CAPTURE_EVENT));
    if (newProject) window.dispatchEvent(new CustomEvent(OPEN_NEW_PROJECT_EVENT));
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
    const onOpenNewProject = () => {
      if (mountedRef.current) return;
      pendingRef.current.newProject = true;
      preload();
    };
    window.addEventListener(OPEN_PALETTE_EVENT, onOpenPalette);
    window.addEventListener(OPEN_ABYSS_CAPTURE_EVENT, onOpenAbyss);
    window.addEventListener(OPEN_NEW_PROJECT_EVENT, onOpenNewProject);
    return () => {
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpenPalette);
      window.removeEventListener(OPEN_ABYSS_CAPTURE_EVENT, onOpenAbyss);
      window.removeEventListener(OPEN_NEW_PROJECT_EVENT, onOpenNewProject);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;

      // `n` opens the create-project dialog from anywhere (Kash 3.2, decision 1A).
      // Bare letter shortcut, so it is gated hard: no modifiers, never while the
      // caret is in a field, and never while another overlay owns the screen.
      if (!meta && !e.altKey && e.key.toLowerCase() === "n") {
        if (isEditableTarget(e.target)) return;
        if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
        e.preventDefault();
        if (mountedRef.current) {
          window.dispatchEvent(new CustomEvent(OPEN_NEW_PROJECT_EVENT));
          return;
        }
        pendingRef.current.newProject = true;
        preload();
        return;
      }

      if (mountedRef.current) return;
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
      <NewProjectOverlay />
    </>
  );
}

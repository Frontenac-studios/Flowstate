"use client";

import { useEffect } from "react";

import { useChat } from "@/components/kash/chat/ChatProvider";

/** Register with ChatProvider while a ritual modal is visible (blocks chat rail). */
export function useRitualOverlay(active: boolean) {
  const { registerRitualOverlay } = useChat();

  useEffect(() => {
    if (!active) return;
    return registerRitualOverlay();
  }, [active, registerRitualOverlay]);
}

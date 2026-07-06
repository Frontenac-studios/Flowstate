"use client";

import { ChatProvider } from "@/components/kash/chat/ChatProvider";
import { EphemeralCelebrationHost } from "@/components/kash/mechanics/EphemeralCelebration";
import { ProactiveNudgesRunner } from "@/components/kash/nudges/ProactiveNudgesRunner";
import ToastProvider from "@/components/kash/ui/ToastProvider";

export default function FocusRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider>
      <ToastProvider>
        <EphemeralCelebrationHost />
        <ProactiveNudgesRunner />
        {children}
      </ToastProvider>
    </ChatProvider>
  );
}

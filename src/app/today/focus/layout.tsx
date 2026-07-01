"use client";

import { ChatProvider } from "@/components/kash/chat/ChatProvider";
import { ProactiveNudgesRunner } from "@/components/kash/nudges/ProactiveNudgesRunner";

export default function FocusRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider>
      <ProactiveNudgesRunner />
      {children}
    </ChatProvider>
  );
}

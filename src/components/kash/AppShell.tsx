import { AppHeader } from "./AppHeader";
import { AppShellContent } from "./AppShellContent";
import { AppShellChatRail, AppShellFixedOverlays } from "./AppShellOverlays";
import { LeftNavRail } from "./LeftNavRail";
import { ChatProvider } from "./chat/ChatProvider";
import { EphemeralCelebrationHost } from "./mechanics/EphemeralCelebration";
import ToastProvider from "./ui/ToastProvider";
import { ProactiveNudgesRunner } from "./nudges/ProactiveNudgesRunner";
export function AppShell({
  children,
  proactiveNudges = false,
}: {
  children: React.ReactNode;
  proactiveNudges?: boolean;
}) {
  return (
    <ChatProvider>
      <ToastProvider>
        {proactiveNudges ? <ProactiveNudgesRunner /> : null}
        <EphemeralCelebrationHost />
        <div className="relative min-h-screen">
          <div className="kash-shell-inner relative z-sticky mx-auto flex min-h-screen w-full max-w-[110rem] gap-6 px-4 py-6 sm:px-6 lg:px-10">
            <LeftNavRail />
            <div className="flex min-w-0 flex-1 flex-col">
              <AppHeader />
              <AppShellContent>{children}</AppShellContent>
            </div>
            <AppShellChatRail />
          </div>
          <AppShellFixedOverlays />
        </div>
      </ToastProvider>
    </ChatProvider>
  );
}

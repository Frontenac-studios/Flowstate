import { AppShellContent } from "./AppShellContent";
import { AppShellChatRail, AppShellFixedOverlays } from "./AppShellOverlays";
import { LeftNavRail } from "./LeftNavRail";
import { ChatProvider } from "./chat/ChatProvider";
import { EphemeralCelebrationHost } from "./mechanics/EphemeralCelebration";
import ToastProvider from "./ui/ToastProvider";
import { ProactiveNudgesRunner } from "./nudges/ProactiveNudgesRunner";
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider>
      <ToastProvider>
        <ProactiveNudgesRunner />
        <EphemeralCelebrationHost />
        <div className="relative min-h-screen">
          <div className="kash-shell-inner relative z-sticky mx-auto flex min-h-screen w-full max-w-[110rem] lg:h-screen lg:overflow-hidden">
            <LeftNavRail />
            <div className="flex min-w-0 flex-1 flex-col lg:min-h-0 lg:overflow-y-auto">
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

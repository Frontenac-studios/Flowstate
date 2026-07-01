import { AppHeader } from "./AppHeader";
import { AppShellChatRail, AppShellFixedOverlays } from "./AppShellOverlays";
import { LeftNavRail } from "./LeftNavRail";
import { ChatProvider } from "./chat/ChatProvider";
import ToastProvider from "./ui/ToastProvider";
import { ProactiveNudgesRunner } from "./nudges/ProactiveNudgesRunner";

/**
 * The single app shell every destination renders inside: left nav rail ·
 * content · right chat rail, with a neutral header and the command palette.
 * Section-specific providers (e.g. plan mode) and triage panels are mounted by
 * the individual routes, not here.
 */
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
        <div className="relative min-h-screen">
          <div className="kash-shell-inner relative z-sticky mx-auto flex min-h-screen w-full max-w-[110rem] gap-6 px-4 py-6 sm:px-6 lg:px-10">
            <LeftNavRail />
            <div className="flex min-w-0 flex-1 flex-col">
              <AppHeader />
              <div className="flex min-h-0 flex-1 flex-col">{children}</div>
            </div>
            <AppShellChatRail />
          </div>
          <AppShellFixedOverlays />
        </div>
      </ToastProvider>
    </ChatProvider>
  );
}

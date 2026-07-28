import { AppShellContent } from "./AppShellContent";
import { AppShellChatRail, AppShellFixedOverlays } from "./AppShellOverlays";
import { LeftNavRail } from "./LeftNavRail";
import MobileBottomNav from "./MobileBottomNav";
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
        <div className="relative min-h-screen lg:flex">
          {/* Rail sits outside the padded/centered shell so it anchors flush to
              the window's left, top, and bottom edges. */}
          <LeftNavRail />
          <div className="kash-shell-inner relative z-sticky mx-auto flex min-h-screen w-full min-w-0 max-w-[110rem] flex-1 lg:h-screen lg:overflow-hidden">
            <div className="flex min-w-0 flex-1 flex-col lg:min-h-0 lg:overflow-y-auto">
              <AppShellContent>{children}</AppShellContent>
            </div>
            <AppShellChatRail />
          </div>
          {/* Desktop (Tauri) drag handle. The frameless "Overlay" title bar has
              no native draggable region, so this full-width strip across the top
              clearance zone lets the window be moved. Gated to the Tauri runtime
              (html.is-desktop) via CSS; sits at z-sticky so modals/overlays
              (z-overlay+) still take clicks above it, and the native traffic
              lights composite above the webview so they stay clickable. */}
          <div
            data-tauri-drag-region
            aria-hidden
            className="app-drag-strip fixed inset-x-0 top-0 z-sticky h-9"
          />
          <AppShellFixedOverlays />
          <MobileBottomNav />
        </div>
      </ToastProvider>
    </ChatProvider>
  );
}

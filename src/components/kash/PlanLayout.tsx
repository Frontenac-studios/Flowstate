import { DesktopSyncBanner } from "./DesktopSyncBanner";
import { ChatProvider } from "./chat/ChatProvider";
import { ChatRail } from "./chat/ChatRail";
import { GradientBackdrop } from "./GradientBackdrop";
import { EodReviewRunner } from "./eod/EodReviewRunner";
import { MondayEntryRunner } from "./plan/MondayEntryRunner";
import { PlanMainColumn } from "./plan/PlanMainColumn";
import { PlanProvider } from "./plan/PlanProvider";
import { ProactiveNudgesRunner } from "./nudges/ProactiveNudgesRunner";

export function PlanLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider>
      <PlanProvider>
        <ProactiveNudgesRunner />
        <EodReviewRunner />
        <MondayEntryRunner />
        <div className="relative min-h-screen">
          <GradientBackdrop />
          <DesktopSyncBanner />
          <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[110rem] justify-center gap-6 px-4 py-6 sm:px-6 lg:px-10">
            <PlanMainColumn>{children}</PlanMainColumn>
            <ChatRail />
          </div>
        </div>
      </PlanProvider>
    </ChatProvider>
  );
}

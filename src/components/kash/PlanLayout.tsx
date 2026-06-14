import { BottomDock } from "./BottomDock";
import { CommandPalette } from "./CommandPalette";
import { LeftNavRail } from "./LeftNavRail";
import { ChatProvider } from "./chat/ChatProvider";
import { EodReviewRunner } from "./eod/EodReviewRunner";
import { MondayEntryRunner } from "./plan/MondayEntryRunner";
import { PlanMainColumn } from "./plan/PlanMainColumn";
import { PlanProvider } from "./plan/PlanProvider";
import { ProactiveNudgesRunner } from "./nudges/ProactiveNudgesRunner";
import { Top3RolloverRunner } from "./plan/Top3RolloverRunner";

export function PlanLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider>
      <PlanProvider>
        <ProactiveNudgesRunner />
        <Top3RolloverRunner />
        <EodReviewRunner />
        <MondayEntryRunner />
        <div className="relative min-h-screen">
          <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[110rem] gap-6 px-4 py-6 pb-24 sm:px-6 lg:px-10">
            <LeftNavRail />
            <PlanMainColumn>{children}</PlanMainColumn>
          </div>
          <BottomDock />
          <CommandPalette />
        </div>
      </PlanProvider>
    </ChatProvider>
  );
}

import { ChatProvider } from "./chat/ChatProvider";
import { ChatRail } from "./chat/ChatRail";
import { GradientBackdrop } from "./GradientBackdrop";
import { KashHeader } from "./KashHeader";

export function PlanLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider>
      <div className="relative min-h-screen">
        <GradientBackdrop />
        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl gap-4 px-4 py-6 sm:px-6">
          <div className="min-w-0 max-w-3xl flex-1">
            <KashHeader />
            {children}
          </div>
          <ChatRail />
        </div>
      </div>
    </ChatProvider>
  );
}

import { GradientBackdrop } from "./GradientBackdrop";
import { KashHeader } from "./KashHeader";

export function PlanLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <GradientBackdrop />
      <div className="relative z-10 mx-auto min-h-screen w-full max-w-3xl px-4 py-6 sm:px-6">
        <KashHeader />
        {children}
      </div>
    </div>
  );
}

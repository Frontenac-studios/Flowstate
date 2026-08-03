import { SurfaceCoachLayout } from "@/components/kash/chat/SurfaceCoachLayout";
import { ContextualInbox } from "@/components/kash/inbox/ContextualInbox";
import { LensProvider } from "@/components/kash/plan/LensProvider";
import { PlanCanvas } from "@/components/kash/plan/PlanCanvas";
import { PlanSurface } from "@/components/kash/plan/PlanSurface";

export default function TodayPage() {
  return (
    <SurfaceCoachLayout surface="today" variant="fill">
      <PlanSurface>
        <LensProvider scope="today">
          <PlanCanvas />
        </LensProvider>
        <ContextualInbox placement="bottom" />
      </PlanSurface>
    </SurfaceCoachLayout>
  );
}

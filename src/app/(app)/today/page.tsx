import { ContextualInbox } from "@/components/kash/inbox/ContextualInbox";
import { LensProvider } from "@/components/kash/plan/LensProvider";
import { PlanCanvas } from "@/components/kash/plan/PlanCanvas";
import { PlanSurface } from "@/components/kash/plan/PlanSurface";

export default function TodayPage() {
  return (
    <PlanSurface>
      <LensProvider scope="today">
        <PlanCanvas />
      </LensProvider>
      <ContextualInbox placement="bottom" />
    </PlanSurface>
  );
}

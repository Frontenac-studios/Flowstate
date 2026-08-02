import { SurfaceCoachLayout } from "@/components/kash/chat/SurfaceCoachLayout";
import { ThisWeekSurface } from "@/components/kash/plan/week/ThisWeekSurface";

export default function ThisWeekPage() {
  return (
    <SurfaceCoachLayout surface="week" variant="fill">
      <ThisWeekSurface />
    </SurfaceCoachLayout>
  );
}

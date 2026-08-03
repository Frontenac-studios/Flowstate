import { SurfaceCoachLayout } from "@/components/kash/chat/SurfaceCoachLayout";
import LooseTasksIndex from "@/components/kash/projects/LooseTasksIndex";

export default function LooseTasksPage() {
  return (
    <SurfaceCoachLayout surface="loose-tasks">
      <LooseTasksIndex />
    </SurfaceCoachLayout>
  );
}

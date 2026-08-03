import { SurfaceCoachLayout } from "@/components/kash/chat/SurfaceCoachLayout";
import { WeekReviewView } from "@/components/kash/plan/week/WeekReviewView";

export default function ThisWeekReviewPage() {
  return (
    <SurfaceCoachLayout surface="reviews">
      <WeekReviewView />
    </SurfaceCoachLayout>
  );
}

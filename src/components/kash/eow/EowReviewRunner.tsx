"use client";

import ReviewNudgeChip from "@/components/kash/nudges/ReviewNudgeChip";
import { useEowReviewTrigger } from "@/hooks/useEowReviewTrigger";

export function EowReviewRunner() {
  const { showChip, openReview, dismissChip } = useEowReviewTrigger();

  if (!showChip) return null;

  return (
    <div className="mb-4">
      <ReviewNudgeChip
        kind="eow"
        message="End of week review — take a moment to see how the week went."
        onReview={openReview}
        onDismiss={dismissChip}
      />
    </div>
  );
}

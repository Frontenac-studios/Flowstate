"use client";

import { useQueryClient } from "@tanstack/react-query";

import { useEodReviewTrigger } from "@/hooks/useEodReviewTrigger";
import { useRitualOverlay } from "@/hooks/useRitualOverlay";
import { useTRPC } from "@/trpc/client";

import { EodReviewBanner } from "./EodReviewBanner";
import { EodReviewModal } from "./EodReviewModal";

export function EodReviewRunner() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const {
    localDate,
    tzOffsetMinutes,
    modalOpen,
    showBanner,
    savedReviewExists,
    openReview,
    closeModal,
    snooze,
    skipToday,
    refreshStorage,
  } = useEodReviewTrigger();

  useRitualOverlay(modalOpen);

  const bannerVariant = savedReviewExists ? "saved" : "due";

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: trpc.dayReviews.getForDate.queryKey({ localDate }),
    });
    void queryClient.invalidateQueries({
      queryKey: trpc.dayReviews.getPayload.queryKey({ localDate, tzOffsetMinutes }),
    });
    refreshStorage();
  };

  return (
    <>
      {showBanner ? (
        <EodReviewBanner
          variant={bannerVariant}
          onOpen={openReview}
          onSnooze={snooze}
          onSkip={skipToday}
        />
      ) : null}
      <EodReviewModal
        open={modalOpen}
        localDate={localDate}
        tzOffsetMinutes={tzOffsetMinutes}
        onClose={closeModal}
        onSnooze={snooze}
        onSkip={skipToday}
        onSaved={invalidate}
      />
    </>
  );
}

"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Sparkles, X, withKashIcon } from "@/components/kash/ui/icon";
import type { ConstellationItem } from "@/lib/abyss/constellations";
import { buildMonthlyReview } from "@/lib/abyss/monthly-review";
import { writeLastReviewMonth } from "@/lib/abyss/review-storage";
import { useTRPC } from "@/trpc/client";
const SparkleIcon = withKashIcon(Sparkles);
const CloseIcon = withKashIcon(X);
export default function AbyssMonthlyReview({
  items,
  now,
  onDismiss,
}: {
  items: ConstellationItem[];
  now: Date;
  onDismiss: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const review = useMemo(() => buildMonthlyReview(items, now), [items, now]);
  const recordResurface = useMutation(trpc.abyss.recordResurface.mutationOptions());
  const [submitting, setSubmitting] = useState(false);

  // ✕ also records the month so a dismissed review doesn't re-open next mount.
  const dismissForMonth = () => {
    writeLastReviewMonth(review.monthKey);
    onDismiss();
  };

  const handleDone = async () => {
    if (submitting) return;
    setSubmitting(true);
    const ids = [
      ...review.constellations.flatMap((c) => c.memberIds),
      ...review.keepsCalling.map((i) => i.id),
    ];
    // Best-effort resurface tracking — await the batch so the button can show a
    // pending state instead of firing an unbounded fire-and-forget loop.
    await Promise.allSettled(ids.map((id) => recordResurface.mutateAsync({ id })));
    void queryClient.invalidateQueries({ queryKey: trpc.abyss.list.queryKey() });
    writeLastReviewMonth(review.monthKey);
    setSubmitting(false);
    onDismiss();
  };

  return (
    <div className="flex flex-col gap-3 rounded-card border border-abyss-border bg-abyss-surface p-4 shadow-surface">
      <div className="flex justify-between">
        <div className="flex items-center gap-2">
          <SparkleIcon size={18} />
          <h2 className="text-subtitle">Stargazing review</h2>
        </div>
        <button type="button" onClick={dismissForMonth} aria-label="Dismiss review">
          <CloseIcon size={16} />
        </button>
      </div>
      {review.constellations.map((c) => (
        <section key={c.id} className="rounded-row border border-abyss-border px-3 py-2">
          <h3 className="text-meta">{c.label}</h3>
        </section>
      ))}
      <button
        type="button"
        onClick={() => void handleDone()}
        disabled={submitting}
        className="self-start rounded-control bg-abyss-accent px-3 py-1.5 text-meta text-abyss-on-accent disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Done stargazing"}
      </button>
    </div>
  );
}

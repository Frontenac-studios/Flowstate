"use client";

import { useEffect, useState } from "react";

import { VALUES_MIN } from "@/lib/about-me/constants";
import {
  isValuesYearlyReviewDue,
  markValuesReviewedForYear,
  readValuesReviewStorage,
  snoozeValuesReviewUntil,
} from "@/lib/about-me/values-review-storage";

type Props = {
  valueCount: number;
};

const SNOOZE_DAYS = 30;

export default function ValuesYearlyReviewBanner({ valueCount }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const now = new Date();
    const storage = readValuesReviewStorage();
    setVisible(isValuesYearlyReviewDue(now, storage, valueCount, VALUES_MIN));
  }, [valueCount]);

  if (!visible) return null;

  const dismissForYear = () => {
    markValuesReviewedForYear(new Date().getFullYear());
    setVisible(false);
  };

  const snooze = () => {
    const until = new Date();
    until.setDate(until.getDate() + SNOOZE_DAYS);
    snoozeValuesReviewUntil(until.toISOString());
    setVisible(false);
  };

  return (
    <div
      role="status"
      className="mb-4 rounded-card border border-dashed border-border bg-surface-2 px-4 py-3"
    >
      <p className="text-body text-ink">
        A new year is a good moment to glance at your core values — still feel right?
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={dismissForYear}
          className="rounded-control border-[1.5px] border-ink px-3 py-1.5 text-caption font-medium text-ink transition hover:bg-surface"
        >
          Looks good
        </button>
        <button
          type="button"
          onClick={snooze}
          className="rounded-control px-3 py-1.5 text-caption text-ink-muted transition hover:text-ink"
        >
          Remind me in {SNOOZE_DAYS} days
        </button>
      </div>
    </div>
  );
}

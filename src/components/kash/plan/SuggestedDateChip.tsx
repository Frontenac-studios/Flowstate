"use client";

import { useMutation } from "@tanstack/react-query";

import { parseISODateString } from "@/lib/dates/local-day";
import { useTRPC } from "@/trpc/client";

const SHORT_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** "Thu 10" — weekday + day-of-month, unambiguous for out-of-week suggestions. */
export function suggestionLabel(iso: string): string {
  const date = parseISODateString(iso);
  return `${SHORT_WEEKDAYS[date.getDay()]} ${date.getDate()}`;
}

/** "Thu" — short weekday for the compact Accept button. */
export function suggestionWeekday(iso: string): string {
  return SHORT_WEEKDAYS[parseISODateString(iso).getDay()];
}

type Props = {
  taskId: string;
  suggestedScheduledDate: string;
  onAccepted?: () => void;
  onError?: () => void;
  className?: string;
};

export default function SuggestedDateChip({
  taskId,
  suggestedScheduledDate,
  onAccepted,
  onError,
  className = "mt-0.5 flex shrink-0 items-center gap-1.5 self-start",
}: Props) {
  const trpc = useTRPC();

  const acceptSuggestedDateMutation = useMutation(
    trpc.tasks.acceptSuggestedDate.mutationOptions({
      onSuccess: () => onAccepted?.(),
      onError: () => onError?.(),
    })
  );

  return (
    <div className={className} onClick={(e) => e.stopPropagation()}>
      <span
        className="rounded-pill border border-border px-2 py-0.5 text-xs text-ink-muted"
        title={`Suggested for ${suggestedScheduledDate}`}
      >
        {suggestionLabel(suggestedScheduledDate)}
      </span>
      <button
        type="button"
        className="kash-focus-visible rounded-pill border border-accent px-2 py-0.5 text-xs font-medium text-accent transition hover:bg-[var(--accent-soft)] disabled:opacity-50"
        disabled={acceptSuggestedDateMutation.isPending}
        aria-label={`Accept suggested date, schedule for ${suggestedScheduledDate}`}
        onClick={(e) => {
          e.stopPropagation();
          acceptSuggestedDateMutation.mutate({ id: taskId });
        }}
      >
        Accept → {suggestionWeekday(suggestedScheduledDate)}
      </button>
    </div>
  );
}

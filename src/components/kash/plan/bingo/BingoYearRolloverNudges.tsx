"use client";

import { useQuery } from "@tanstack/react-query";
import { Calendar, X } from "lucide-react";
import { useEffect, useState } from "react";

import "@/components/kash/ui/feedback-motion.css";
import Button from "@/components/kash/ui/Button";
import IconButton from "@/components/kash/ui/IconButton";
import { kashIconProps } from "@/components/kash/ui/icon";
import { cn } from "@/lib/cn";
import {
  finalizeReminderMessage,
  finalizeReminderUrgency,
  isFinalizeReminderDue,
  isNextYearBingoPromptDue,
  nextYearBingoPromptMessage,
} from "@/lib/planning/bingo-year-rollover";
import {
  dismissFinalizeReminder,
  dismissNextYearBingoPrompt,
  readBingoYearRolloverStorage,
  snoozeFinalizeReminderUntil,
  snoozeNextYearBingoPromptUntil,
} from "@/lib/planning/bingo-year-rollover-storage";
import { useTRPC } from "@/trpc/client";

const EXIT_MS = 160;
const NEXT_YEAR_SNOOZE_DAYS = 7;
const FINALIZE_SNOOZE_DAYS_GENTLE = 3;
const FINALIZE_SNOOZE_DAYS_URGENT = 1;

type Props = {
  onStartNextYear: (year: number) => void;
  onOpenBingo: (year: number) => void;
};

function addDays(now: Date, days: number): string {
  const next = new Date(now);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

function PlanRolloverNudge({
  message,
  actionLabel,
  snoozeLabel,
  onAction,
  onSnooze,
  onDismiss,
}: {
  message: string;
  actionLabel: string;
  snoozeLabel: string;
  onAction: () => void;
  onSnooze: () => void;
  onDismiss: () => void;
}) {
  const [exiting, setExiting] = useState(false);

  const handleDismiss = () => {
    setExiting(true);
    window.setTimeout(onDismiss, EXIT_MS);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-[var(--space-3)] rounded-row border border-l-[length:var(--stripe-width)] border-border border-l-ink bg-surface px-[var(--space-3)] py-[var(--space-2)]",
        exiting ? "nudge-fade-out" : "nudge-fade-in"
      )}
      role="region"
      aria-label="Bingo year rollover nudge"
    >
      <Calendar
        {...kashIconProps({ tokenSize: "md", className: "shrink-0 text-ink-muted" })}
        aria-hidden
      />
      <p className="min-w-0 flex-1 text-body text-ink">{message}</p>
      <Button type="button" variant="ghost" className="shrink-0 text-body" onClick={onAction}>
        {actionLabel}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="shrink-0 text-caption text-ink-muted"
        onClick={onSnooze}
      >
        {snoozeLabel}
      </Button>
      <IconButton type="button" aria-label="Dismiss nudge" onClick={handleDismiss}>
        <X {...kashIconProps({ tokenSize: "sm" })} aria-hidden />
      </IconButton>
    </div>
  );
}

/** Late-Dec next-year prompt + January finalize reminders (§11.2 YR-1). */
export default function BingoYearRolloverNudges({ onStartNextYear, onOpenBingo }: Props) {
  const trpc = useTRPC();
  const [now, setNow] = useState<Date | null>(null);
  const [storageTick, setStorageTick] = useState(0);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const calendarYear = now?.getFullYear() ?? new Date().getFullYear();
  const nextYear = calendarYear + 1;

  const nextYearCardQuery = useQuery({
    ...trpc.planning.getBingoCard.queryOptions({ cardYear: nextYear }),
    enabled: now != null,
  });
  const currentYearCardQuery = useQuery({
    ...trpc.planning.getBingoCard.queryOptions({ cardYear: calendarYear }),
    enabled: now != null,
  });

  const storage = readBingoYearRolloverStorage();
  void storageTick;

  const refreshStorage = () => setStorageTick((n) => n + 1);

  if (!now) return null;

  const hasNextYearCard = nextYearCardQuery.data != null;
  const showNextYearPrompt = isNextYearBingoPromptDue(now, nextYear, hasNextYearCard, storage);

  const currentCard = currentYearCardQuery.data ?? null;
  const urgency = finalizeReminderUrgency(now);
  const showFinalizeReminder =
    urgency != null &&
    isFinalizeReminderDue(now, calendarYear, currentCard?.status ?? null, storage);

  if (!showNextYearPrompt && !showFinalizeReminder) return null;

  const snoozeDays =
    urgency === "urgent" ? FINALIZE_SNOOZE_DAYS_URGENT : FINALIZE_SNOOZE_DAYS_GENTLE;

  return (
    <div className="flex flex-col gap-2">
      {showNextYearPrompt ? (
        <PlanRolloverNudge
          message={nextYearBingoPromptMessage(nextYear)}
          actionLabel={`Start ${nextYear} card`}
          snoozeLabel={`Remind in ${NEXT_YEAR_SNOOZE_DAYS}d`}
          onAction={() => {
            dismissNextYearBingoPrompt(nextYear);
            refreshStorage();
            onStartNextYear(nextYear);
          }}
          onSnooze={() => {
            snoozeNextYearBingoPromptUntil(addDays(now, NEXT_YEAR_SNOOZE_DAYS));
            refreshStorage();
          }}
          onDismiss={() => {
            dismissNextYearBingoPrompt(nextYear);
            refreshStorage();
          }}
        />
      ) : null}
      {showFinalizeReminder && urgency ? (
        <PlanRolloverNudge
          message={finalizeReminderMessage(calendarYear, urgency)}
          actionLabel="Open bingo"
          snoozeLabel={`Remind in ${snoozeDays}d`}
          onAction={() => {
            refreshStorage();
            onOpenBingo(calendarYear);
          }}
          onSnooze={() => {
            snoozeFinalizeReminderUntil(addDays(now, snoozeDays));
            refreshStorage();
          }}
          onDismiss={() => {
            dismissFinalizeReminder(calendarYear, urgency);
            refreshStorage();
          }}
        />
      ) : null}
    </div>
  );
}

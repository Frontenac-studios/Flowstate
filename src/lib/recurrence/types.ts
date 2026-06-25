export type OccurrenceOverrideStatus = "completed" | "skipped" | "rescheduled" | "edited";

export type OccurrenceOverrideInput = {
  occurrenceDate: string;
  status: OccurrenceOverrideStatus;
  movedToDate: string | null;
  patch: Record<string, unknown> | null;
  completedAt: Date | null;
};

export type RecurrenceWindow = {
  /** Inclusive ISO date YYYY-MM-DD */
  start: string;
  /** Inclusive ISO date YYYY-MM-DD */
  end: string;
};

export type ExpandedOccurrence = {
  /** The date the rule produced (override key). */
  occurrenceDate: string;
  /** Where the occurrence renders (after reschedule). */
  displayDate: string;
  patch: Record<string, unknown> | null;
};

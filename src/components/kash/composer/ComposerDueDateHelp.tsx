"use client";

import { useId, type ReactNode } from "react";

import { SCHEDULED_DATE_INPUT_HELP } from "@/lib/dates/scheduled-date-input";

type Props = {
  label: ReactNode;
  pillClassName: string;
  isActive?: boolean;
  filledScreenReader?: ReactNode;
};

export default function ComposerDueDateHelp({
  label,
  pillClassName,
  isActive,
  filledScreenReader,
}: Props) {
  const tooltipId = useId();

  return (
    <span className="group/due relative inline-flex">
      <button
        type="button"
        role="listitem"
        aria-current={isActive ? "step" : undefined}
        aria-describedby={tooltipId}
        className={pillClassName}
      >
        {label}
        {filledScreenReader}
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className="border-ink/10 pointer-events-none invisible absolute bottom-full left-1/2 z-modal mb-2 w-56 -translate-x-1/2 rounded-control border bg-[var(--tooltip-bg)] px-3 py-2 text-left text-xs font-normal normal-case text-[var(--tooltip-ink)] shadow-overlay group-focus-within/due:visible group-hover/due:visible"
      >
        <span className="mb-1 block font-medium">Due date</span>
        <span className="text-[var(--tooltip-ink)]/80 mb-1.5 block">
          {SCHEDULED_DATE_INPUT_HELP.summary}
        </span>
        <ul className="text-[var(--tooltip-ink)]/80 space-y-1">
          <li>Keywords: {SCHEDULED_DATE_INPUT_HELP.keywords.join(", ")}</li>
          <li>Weekday: {SCHEDULED_DATE_INPUT_HELP.weekdays.join(", ")}</li>
          <li>ISO date: YYYY-MM-DD (e.g. {SCHEDULED_DATE_INPUT_HELP.isoExample})</li>
        </ul>
        <span className="text-[var(--tooltip-ink)]/70 mt-1.5 block">
          Tab to accept inline suggestion
        </span>
      </span>
    </span>
  );
}

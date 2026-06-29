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
        className="border-ink/10 pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-lg border bg-white px-3 py-2 text-left text-xs font-normal normal-case text-ink shadow-md group-focus-within/due:visible group-hover/due:visible"
      >
        <span className="mb-1 block font-medium text-ink">Due date</span>
        <span className="mb-1.5 block text-ink-muted">{SCHEDULED_DATE_INPUT_HELP.summary}</span>
        <ul className="space-y-1 text-ink-muted">
          <li>Keywords: {SCHEDULED_DATE_INPUT_HELP.keywords.join(", ")}</li>
          <li>Weekday: {SCHEDULED_DATE_INPUT_HELP.weekdays.join(", ")}</li>
          <li>ISO date: YYYY-MM-DD (e.g. {SCHEDULED_DATE_INPUT_HELP.isoExample})</li>
        </ul>
        <span className="text-ink-muted/80 mt-1.5 block">Tab to accept inline suggestion</span>
      </span>
    </span>
  );
}

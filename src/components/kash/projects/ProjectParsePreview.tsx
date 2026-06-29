import { formatScheduledDateLabel } from "@/lib/dates/scheduled-date-input";
import type { ParseProjectTaskResult } from "@/lib/parser/parse-project-task-input";
import { priorityMeta } from "@/lib/tasks/priority";

export function getProjectParseChips(parse: ParseProjectTaskResult): string[] {
  const chips: string[] = [];
  const dateLabel = formatScheduledDateLabel(parse.scheduledDate, {
    bucketOverride: parse.bucketOverride,
  });
  if (dateLabel) chips.push(dateLabel);
  if (parse.priority > 0) chips.push(priorityMeta(parse.priority).label);
  if (parse.parentDirName) chips.push(parse.parentDirName);
  return chips;
}

type Props = {
  parse: ParseProjectTaskResult;
};

export default function ProjectParsePreview({ parse }: Props) {
  const chips = getProjectParseChips(parse);
  if (chips.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-1" aria-live="polite">
      {chips.map((chip) => (
        <span
          key={chip}
          className="rounded-pill border border-border bg-surface px-1.5 py-0.5 text-[10px] text-ink-muted"
        >
          {chip}
        </span>
      ))}
    </div>
  );
}

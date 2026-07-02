import type { CSSProperties } from "react";

import { formatScheduledDateLabel } from "@/lib/dates/scheduled-date-input";
import type { ParsedLine, ParseResult } from "@/lib/parser/parse-quick-input";
import { categoryFillVar, categorySolidVar, categoryTextVar } from "@/lib/projects/category-tokens";
import type { ProjectCategory } from "@/lib/projects/categories";
import { priorityMeta } from "@/lib/tasks/priority";

type Props = {
  parse: ParseResult;
};

export function getParseChips(parse: ParseResult): string[] {
  const chips: string[] = [];
  const dateLabel = formatScheduledDateLabel(parse.scheduledDate, {
    bucketOverride: parse.bucketOverride,
  });
  if (dateLabel) chips.push(dateLabel);
  if (parse.priority > 0) chips.push(priorityMeta(parse.priority).label);
  if (parse.recurrenceLabel) chips.push(`↻ ${parse.recurrenceLabel}`);
  if (parse.projectSlug) chips.push(parse.projectSlug);
  for (const tag of parse.tags) chips.push(`#${tag}`);
  return chips;
}

function chipStyle(category: ProjectCategory | null, chip: string): CSSProperties | undefined {
  if (!category) return undefined;
  if (chip.startsWith("#")) return undefined;
  return {
    backgroundColor: categoryFillVar(category),
    borderColor: categorySolidVar(category),
    color: categoryTextVar(category),
  };
}

function ChipRow({ chips, category }: { chips: string[]; category: ProjectCategory | null }) {
  if (chips.length === 0) return null;
  return (
    <>
      {chips.map((chip) => (
        <span
          key={chip}
          className="min-w-[2.5rem] shrink-0 rounded-pill border border-border bg-surface px-2 py-0.5 text-xs text-ink-muted"
          style={chipStyle(category, chip)}
        >
          {chip}
        </span>
      ))}
    </>
  );
}

export function ParsePreviewChips({ parse }: Props) {
  const chips = getParseChips(parse);
  if (chips.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5" aria-live="polite">
      <ChipRow chips={chips} category={parse.category} />
    </div>
  );
}

type MultiLineProps = {
  lines: ParsedLine[];
};

export function MultiLineParsePreview({ lines }: MultiLineProps) {
  if (lines.length === 0) return null;

  return (
    <ul className="mt-2 space-y-1.5" aria-live="polite">
      {lines.map((line) => {
        const chips = getParseChips(line.parse);
        return (
          <li
            key={line.lineIndex}
            className="flex min-w-0 items-center gap-2 text-xs text-ink-muted"
          >
            <span className="min-w-0 flex-1 break-words">{line.parse.title}</span>
            <span className="flex shrink-0 flex-wrap justify-end gap-1">
              <ChipRow chips={chips} category={line.parse.category} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

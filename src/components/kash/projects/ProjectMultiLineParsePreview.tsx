import type { ParsedProjectLine } from "@/lib/parser/parse-project-task-input";

import { getProjectParseChips } from "./ProjectParsePreview";

type Props = {
  lines: ParsedProjectLine[];
};

export default function ProjectMultiLineParsePreview({ lines }: Props) {
  if (lines.length === 0) return null;

  return (
    <ul className="mt-2 space-y-1.5" aria-live="polite">
      {lines.map((line) => {
        const chips = getProjectParseChips(line.parse);
        return (
          <li
            key={line.lineIndex}
            className="flex min-w-0 items-center gap-2 text-xs text-ink-muted"
          >
            <span className="min-w-0 flex-1 truncate">
              {line.parse.phaseOnly ? "(new phase)" : line.parse.title}
            </span>
            <span className="flex shrink-0 flex-wrap justify-end gap-1.5">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="shrink-0 rounded-pill border border-border bg-surface px-2 py-0.5 text-xs"
                >
                  {chip}
                </span>
              ))}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

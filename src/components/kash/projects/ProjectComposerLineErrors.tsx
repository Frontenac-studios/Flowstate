import type { ParsedProjectLine } from "@/lib/parser/parse-project-task-input";

import ProjectParseError from "./ProjectParseError";

type Props = {
  lines: ParsedProjectLine[];
};

function lineLabel(line: ParsedProjectLine): string {
  const title = line.parse.title || line.raw;
  return title.length > 40 ? `${title.slice(0, 40)}…` : title;
}

export default function ProjectComposerLineErrors({ lines }: Props) {
  const invalidLines = lines.filter((line) => line.parse.warnings.length > 0);
  if (invalidLines.length === 0) return null;

  return (
    <ul className="mt-1 space-y-1" role="alert">
      {invalidLines.map((line) => (
        <li key={line.lineIndex} className="text-xs">
          <span className="font-medium text-ink">{lineLabel(line)}</span>
          <ProjectParseError warnings={line.parse.warnings} />
        </li>
      ))}
    </ul>
  );
}

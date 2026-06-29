import type { ProjectParseWarning } from "@/lib/parser/parse-project-task-input";

function warningMessage(warning: ProjectParseWarning): string {
  switch (warning.code) {
    case "invalid_property":
      return `Invalid ${warning.field}: "${warning.property}"`;
    case "phase_not_found":
      if (warning.underParent) {
        return `No phase "${warning.name}" under "${warning.underParent}"`;
      }
      return `No phase named "${warning.name}"`;
    case "phase_ambiguous":
      return `Ambiguous phase "${warning.name}" (${warning.matches.join(", ")})`;
    case "empty_phase_name":
      return "Parent directory name is required after +";
  }
}

function isBlockingWarning(warning: ProjectParseWarning): boolean {
  return (
    warning.code === "invalid_property" ||
    warning.code === "phase_not_found" ||
    warning.code === "phase_ambiguous" ||
    warning.code === "empty_phase_name"
  );
}

type Props = {
  warnings: ProjectParseWarning[];
};

export default function ProjectParseError({ warnings }: Props) {
  if (warnings.length === 0) return null;

  return (
    <div className="mt-1 space-y-0.5" role="alert">
      {warnings.map((warning, index) => (
        <p
          key={`${warning.code}-${index}`}
          className={`text-[10px] leading-snug ${
            isBlockingWarning(warning) ? "text-critical" : "text-ink-muted"
          }`}
        >
          {warningMessage(warning)}
        </p>
      ))}
    </div>
  );
}

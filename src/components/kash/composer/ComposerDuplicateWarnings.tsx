import type { DuplicateTaskWarning } from "@/lib/tasks/detect-duplicate-task-warnings";

type PhaseLookup = {
  phaseId: string;
  name: string;
};

type Props = {
  warnings: DuplicateTaskWarning[];
  /** When provided, phase names are shown in messages. */
  phases?: PhaseLookup[];
  /** Plan page has no phase; project page scopes by phase. */
  context?: "plan" | "project";
};

function phaseLabel(phaseId: string | null, phases?: PhaseLookup[]): string {
  if (phaseId === null) return "this project";
  const phase = phases?.find((p) => p.phaseId === phaseId);
  return phase ? `"${phase.name}"` : "this phase";
}

function warningMessage(
  warning: DuplicateTaskWarning,
  phases?: PhaseLookup[],
  context: "plan" | "project" = "project"
): string {
  const quotedTitle = `"${warning.title}"`;

  if (warning.matchKind === "batch") {
    if (context === "plan") {
      return `${quotedTitle} is duplicated in this input.`;
    }
    return `${quotedTitle} is duplicated in this input (${phaseLabel(warning.phaseId, phases)}).`;
  }

  if (context === "plan") {
    return `${quotedTitle} already exists.`;
  }

  return `${quotedTitle} already exists in ${phaseLabel(warning.phaseId, phases)}.`;
}

export default function ComposerDuplicateWarnings({
  warnings,
  phases,
  context = "project",
}: Props) {
  if (warnings.length === 0) return null;

  const byLine = new Map<number, DuplicateTaskWarning[]>();
  for (const warning of warnings) {
    const list = byLine.get(warning.lineIndex) ?? [];
    list.push(warning);
    byLine.set(warning.lineIndex, list);
  }

  return (
    <div className="mt-3 space-y-2" role="status" aria-live="polite">
      {Array.from(byLine.entries()).map(([lineIndex, lineWarnings]) => (
        <div
          key={lineIndex}
          className="rounded-control border border-subtle bg-surface-2 p-3 text-sm text-ink-muted"
        >
          {lineWarnings.map((warning, i) => (
            <p key={`${warning.matchKind}-${i}`}>
              Line {lineIndex + 1}: {warningMessage(warning, phases, context)}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

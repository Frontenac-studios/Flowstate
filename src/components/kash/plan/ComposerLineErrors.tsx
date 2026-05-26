"use client";

import type { ParsedLine } from "@/lib/parser/parse-quick-input";
import { slugifyProjectName } from "@/lib/projects/slugify";

type Props = {
  lines: ParsedLine[];
  creatingLineIndex: number | null;
  onApplySuggestion: (line: ParsedLine, suggestedSlug: string) => void;
  onCreateProject: (line: ParsedLine) => void;
};

export function ComposerLineErrors({
  lines,
  creatingLineIndex,
  onApplySuggestion,
  onCreateProject,
}: Props) {
  const invalidLines = lines.filter((line) =>
    line.parse.warnings.some((w) => w.code === "project_not_found")
  );

  if (invalidLines.length === 0) return null;

  return (
    <div className="mt-3 space-y-3">
      {invalidLines.map((line) => {
        const warning = line.parse.warnings.find((w) => w.code === "project_not_found");
        if (!warning) return null;

        return (
          <div
            key={line.lineIndex}
            className="space-y-2 rounded-lg border border-red-200/60 bg-red-50/40 p-3 text-sm"
            role="alert"
          >
            <p className="text-red-600">
              Line {line.lineIndex + 1}: No project{" "}
              <span className="font-mono">#{warning.slug}</span>
              <span className="ml-2 text-kash-ink-muted">&ldquo;{line.raw}&rdquo;</span>
            </p>
            {line.parse.suggestions.length > 0 ? (
              <p className="text-kash-ink-muted">
                Did you mean{" "}
                {line.parse.suggestions.map((s, i) => (
                  <span key={s.slug}>
                    {i > 0 ? ", " : ""}
                    <button
                      type="button"
                      className="glass-link font-medium"
                      onClick={() => onApplySuggestion(line, s.slug)}
                    >
                      #{s.slug}
                    </button>
                  </span>
                ))}
                ?
              </p>
            ) : null}
            <button
              type="button"
              className="glass-pill hover:bg-kash-accent-soft px-3 py-1 text-kash-accent transition"
              onClick={() => onCreateProject(line)}
              disabled={creatingLineIndex === line.lineIndex}
            >
              Create project &ldquo;{slugifyProjectName(warning.slug)}&rdquo;
            </button>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import Link from "next/link";

import type { ParsedLine } from "@/lib/parser/parse-quick-input";

type Props = {
  lines: ParsedLine[];
  onApplySuggestion: (line: ParsedLine, suggestedSlug: string) => void;
};

export function ComposerLineErrors({ lines, onApplySuggestion }: Props) {
  const invalidLines = lines.filter((line) => line.parse.warnings.length > 0);

  if (invalidLines.length === 0) return null;

  return (
    <div className="mt-3 space-y-3">
      {invalidLines.map((line) => {
        const projectWarnings = line.parse.warnings.filter((w) => w.code === "project_not_found");
        const invalidPropertyWarnings = line.parse.warnings.filter(
          (w) => w.code === "invalid_property"
        );

        // Note: a line can have both a missing project and invalid properties;
        // we render both warnings within the same container.
        return (
          <div
            key={line.lineIndex}
            className="space-y-2 rounded-lg border border-red-200/60 bg-red-50/40 p-3 text-sm"
            role="alert"
          >
            {projectWarnings.map((warning) => (
              <div key={warning.slug} className="space-y-2">
                <p className="text-critical">
                  Line {line.lineIndex + 1}: No project{" "}
                  <span className="font-mono">{warning.slug}</span>
                  <span className="ml-2 text-ink-muted">&ldquo;{line.raw}&rdquo;</span>
                </p>
                {line.parse.suggestions.length > 0 ? (
                  <p className="text-ink-muted">
                    Did you mean{" "}
                    {line.parse.suggestions.map((s, i) => (
                      <span key={s.slug}>
                        {i > 0 ? ", " : ""}
                        <button
                          type="button"
                          className="glass-link font-medium"
                          onClick={() => onApplySuggestion(line, s.slug)}
                        >
                          {s.slug}
                        </button>
                      </span>
                    ))}
                    ?
                  </p>
                ) : null}
                <p className="text-ink-muted">
                  Create it in{" "}
                  <Link href="/projects" className="glass-link font-medium">
                    Projects
                  </Link>{" "}
                  first — projects need a category.
                </p>
              </div>
            ))}

            {invalidPropertyWarnings.length > 0 ? (
              <div className="space-y-2">
                {invalidPropertyWarnings.map((w, i) => (
                  <p key={`${w.property}-${i}`} className="text-critical">
                    Line {line.lineIndex + 1}: Unrecognized property{" "}
                    <span className="font-mono">&ldquo;{w.property}&rdquo;</span>
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

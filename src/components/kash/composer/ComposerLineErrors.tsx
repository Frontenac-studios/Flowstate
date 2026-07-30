"use client";

import type { ReactNode } from "react";

/** One-click "Did you mean …?" fix offered against an invalid line. */
export type ComposerErrorSuggestion = {
  /** Button text (e.g. the suggested project slug). */
  label: string;
  onApply: () => void;
};

export type ComposerLineErrorMessage = {
  key: string;
  text: string;
  /** Blocking issues read `critical`; advisory notes read `muted`. Default `critical`. */
  tone?: "critical" | "muted";
};

export type ComposerLineErrorGroup = {
  key: string | number;
  /** Row heading — a line number ("Line 1") or a truncated task title. */
  label: string;
  /** Optional muted echo of the raw line text, shown beside the label. */
  raw?: string;
  messages: ComposerLineErrorMessage[];
  suggestions?: ComposerErrorSuggestion[];
  /** Extra guidance under the messages (e.g. a "Create it in Projects" link). */
  footer?: ReactNode;
};

type Props = {
  groups: ComposerLineErrorGroup[];
};

/**
 * Shared per-line parse-error renderer for every task composer (Plan + Projects).
 * Uses the `critical` status token — no off-palette red — and supports one-click
 * "Did you mean …?" fixes on any surface that supplies suggestions.
 */
export default function ComposerLineErrors({ groups }: Props) {
  if (groups.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {groups.map((group) => (
        <div
          key={group.key}
          className="border-critical/30 bg-critical/5 space-y-1.5 rounded-lg border p-3 text-sm"
          role="alert"
        >
          <p className="font-medium text-ink">
            {group.label}
            {group.raw ? (
              <span className="ml-2 font-normal text-ink-muted">&ldquo;{group.raw}&rdquo;</span>
            ) : null}
          </p>

          {group.messages.map((message) => (
            <p
              key={message.key}
              className={message.tone === "muted" ? "text-ink-muted" : "text-critical"}
            >
              {message.text}
            </p>
          ))}

          {group.suggestions && group.suggestions.length > 0 ? (
            <p className="text-ink-muted">
              Did you mean{" "}
              {group.suggestions.map((suggestion, i) => (
                <span key={suggestion.label}>
                  {i > 0 ? ", " : ""}
                  <button
                    type="button"
                    className="font-medium text-ink underline-offset-2 hover:underline"
                    onClick={suggestion.onApply}
                  >
                    {suggestion.label}
                  </button>
                </span>
              ))}
              ?
            </p>
          ) : null}

          {group.footer}
        </div>
      ))}
    </div>
  );
}

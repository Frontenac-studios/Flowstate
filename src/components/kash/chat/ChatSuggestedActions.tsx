"use client";

import { useEffect, useRef, useState } from "react";

import { SUGGESTION_LABEL_MAX_LENGTH } from "@/lib/chat/chat-phrase-promotion";
import type { ChatSuggestionDef } from "@/lib/chat/chat-suggestion-defs";

type Props = {
  suggestions: ChatSuggestionDef[];
  disabled?: boolean;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  onRename?: (id: string, label: string) => void;
};

const CHIP_CLASS =
  "rounded-pill border border-border bg-surface px-2.5 py-1 text-xs text-ink-muted transition hover:text-accent focus:outline-none focus-visible:shadow-[inset_0_0_0_var(--focus-ring-width)_var(--ink)] disabled:cursor-not-allowed disabled:opacity-50";

/** Revealed on hover or keyboard focus, but always in the DOM so it stays reachable. */
const CHIP_ACTION_CLASS =
  "rounded-pill px-1 text-xs leading-none text-ink-muted opacity-0 transition hover:text-accent focus:outline-none focus-visible:opacity-100 focus-visible:shadow-[inset_0_0_0_var(--focus-ring-width)_var(--ink)] group-hover:opacity-100 group-focus-within:opacity-100";

function RenameChip({
  suggestion,
  onCommit,
  onCancel,
}: {
  suggestion: ChatSuggestionDef;
  onCommit: (label: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(suggestion.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const commit = () => {
    const next = value.trim();
    if (!next || next === suggestion.label) return onCancel();
    onCommit(next);
  };

  return (
    <input
      ref={inputRef}
      value={value}
      maxLength={SUGGESTION_LABEL_MAX_LENGTH}
      aria-label={`Rename suggestion ${suggestion.label}`}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      className={`${CHIP_CLASS} w-48 text-ink focus-visible:shadow-[inset_0_0_0_var(--focus-ring-width)_var(--ink)]`}
    />
  );
}

export function ChatSuggestedActions({
  suggestions,
  disabled,
  onSelect,
  onDelete,
  onRename,
}: Props) {
  const [renamingId, setRenamingId] = useState<string | null>(null);

  if (suggestions.length === 0) return null;

  return (
    <div className="mb-2 flex flex-wrap justify-end gap-1.5">
      {suggestions.map((suggestion) => {
        const isCustom = suggestion.source === "custom";

        if (isCustom && renamingId === suggestion.id) {
          return (
            <RenameChip
              key={suggestion.id}
              suggestion={suggestion}
              onCommit={(label) => {
                setRenamingId(null);
                onRename?.(suggestion.id, label);
              }}
              onCancel={() => setRenamingId(null)}
            />
          );
        }

        const chip = (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelect(suggestion.id)}
            className={isCustom ? `${CHIP_CLASS} border-dashed` : CHIP_CLASS}
          >
            {suggestion.label}
          </button>
        );

        // Built-ins are fixed, so they get no edit affordances.
        if (!isCustom || (!onDelete && !onRename)) {
          return <span key={suggestion.id}>{chip}</span>;
        }

        return (
          <span key={suggestion.id} className="group flex items-center gap-0.5">
            {chip}
            {onRename ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => setRenamingId(suggestion.id)}
                aria-label={`Rename suggestion ${suggestion.label}`}
                title="Rename"
                className={CHIP_ACTION_CLASS}
              >
                ✎
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onDelete(suggestion.id)}
                aria-label={`Remove suggestion ${suggestion.label}`}
                title="Remove"
                className={CHIP_ACTION_CLASS}
              >
                ✕
              </button>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

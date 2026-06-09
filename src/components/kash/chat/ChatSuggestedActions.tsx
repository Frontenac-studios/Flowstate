"use client";

import type { ChatSuggestionDef } from "@/lib/chat/chat-suggestion-defs";

type Props = {
  suggestions: ChatSuggestionDef[];
  disabled?: boolean;
  onSelect: (id: string) => void;
};

export function ChatSuggestedActions({ suggestions, disabled, onSelect }: Props) {
  if (suggestions.length === 0) return null;

  return (
    <div className="mb-2 flex flex-wrap justify-end gap-1.5">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(suggestion.id)}
          className="glass-pill px-2.5 py-1 text-xs text-kash-ink-muted transition hover:text-kash-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {suggestion.label}
        </button>
      ))}
    </div>
  );
}

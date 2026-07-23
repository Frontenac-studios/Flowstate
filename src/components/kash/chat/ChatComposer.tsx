"use client";

import { ArrowUp, Square } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

import Textarea from "@/components/kash/ui/Textarea";

type Props = {
  disabled?: boolean;
  placeholder?: string;
  isStreaming?: boolean;
  onSend: (text: string) => void;
  onStop?: () => void;
  suggestions?: ReactNode;
  /** Textarea row count. Default 2; morning hand-off uses a taller composer. */
  rows?: number;
};

export function ChatComposer({
  disabled,
  placeholder = "Message Claude…",
  isStreaming,
  onSend,
  onStop,
  suggestions,
  rows = 2,
}: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const text = value.trim();
    if (!text || disabled || isStreaming) return;
    onSend(text);
    setValue("");
  };

  const insertNewlineAtCursor = (el: HTMLTextAreaElement) => {
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    setValue(value.slice(0, start) + "\n" + value.slice(end));
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + 1;
    });
  };

  return (
    <div className="border-t border-[var(--border)] pt-3">
      {suggestions}
      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            // Cmd/Ctrl+Enter inserts a newline; plain Enter sends.
            if (e.metaKey || e.ctrlKey) {
              e.preventDefault();
              insertNewlineAtCursor(e.currentTarget);
              return;
            }
            if (!e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={rows}
          disabled={disabled || isStreaming}
          placeholder={placeholder}
          className="flex-1 resize-none text-sm text-ink"
        />
        {isStreaming && onStop ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop generating"
            className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-ink-muted transition hover:text-ink"
          >
            <Square className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={disabled || !value.trim()}
            aria-label="Send message"
            className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-surface transition hover:opacity-90 disabled:opacity-40"
          >
            <ArrowUp className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

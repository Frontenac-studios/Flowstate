"use client";

import { useRef, useState, type ReactNode } from "react";

type Props = {
  disabled?: boolean;
  placeholder?: string;
  isStreaming?: boolean;
  onSend: (text: string) => void;
  suggestions?: ReactNode;
};

export function ChatComposer({
  disabled,
  placeholder = "Message Claude…",
  isStreaming,
  onSend,
  suggestions,
}: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const text = value.trim();
    if (!text || disabled || isStreaming) return;
    onSend(text);
    setValue("");
  };

  return (
    <div className="border-t border-[var(--kash-glass-border)] pt-3">
      {suggestions}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        rows={2}
        disabled={disabled || isStreaming}
        placeholder={placeholder}
        className="glass-textarea glass-input w-full resize-none text-sm text-kash-ink"
      />
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={disabled || isStreaming || !value.trim()}
          className="glass-btn-primary px-3 py-1.5 text-sm"
        >
          {isStreaming ? "Thinking…" : "Send"}
        </button>
      </div>
    </div>
  );
}

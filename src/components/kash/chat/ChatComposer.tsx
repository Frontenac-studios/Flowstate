"use client";

import { useRef, useState, type ReactNode } from "react";

import Button from "@/components/kash/ui/Button";
import Textarea from "@/components/kash/ui/Textarea";

type Props = {
  disabled?: boolean;
  placeholder?: string;
  isStreaming?: boolean;
  onSend: (text: string) => void;
  onStop?: () => void;
  suggestions?: ReactNode;
};

export function ChatComposer({
  disabled,
  placeholder = "Message Claude…",
  isStreaming,
  onSend,
  onStop,
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
      <Textarea
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
        className="w-full resize-none text-sm text-kash-ink"
      />
      <div className="mt-2 flex justify-end gap-2">
        {isStreaming && onStop ? (
          <button
            type="button"
            onClick={onStop}
            className="glass-pill px-3 py-1.5 text-sm text-kash-ink-muted transition hover:text-kash-ink"
          >
            Stop
          </button>
        ) : null}
        <Button
          type="button"
          onClick={submit}
          disabled={disabled || isStreaming || !value.trim()}
          className="px-3 py-1.5 text-sm"
        >
          Send
        </Button>
      </div>
    </div>
  );
}

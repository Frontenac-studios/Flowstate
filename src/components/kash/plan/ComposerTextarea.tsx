"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  type KeyboardEvent,
  type Ref,
} from "react";

export type ComposerTextareaHandle = {
  focus: () => void;
  getSelectionStart: () => number;
  setSelectionRange: (start: number, end: number) => void;
  getTextarea: () => HTMLTextAreaElement | null;
};

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onCursorChange?: (cursor: number) => void;
  ghostSuffix?: string | null;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
};

export const ComposerTextarea = forwardRef(function ComposerTextarea(
  {
    id,
    value,
    onChange,
    onCursorChange,
    ghostSuffix,
    onKeyDown,
    disabled,
    placeholder,
    rows = 2,
  }: Props,
  ref: Ref<ComposerTextareaHandle>
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);

  const syncCursor = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    onCursorChange?.(el.selectionStart ?? 0);
  }, [onCursorChange]);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    getSelectionStart: () => textareaRef.current?.selectionStart ?? 0,
    setSelectionRange: (start, end) => textareaRef.current?.setSelectionRange(start, end),
    getTextarea: () => textareaRef.current,
  }));

  const ghostText = ghostSuffix ? (
    <span className="text-kash-ink-muted/50 italic">{ghostSuffix}</span>
  ) : null;

  return (
    <div className="relative">
      <div
        ref={mirrorRef}
        aria-hidden
        className="glass-input glass-textarea pointer-events-none absolute inset-0 w-full overflow-hidden whitespace-pre-wrap break-words border-transparent bg-transparent text-kash-ink"
      >
        {value}
        {ghostText}
      </div>
      <textarea
        id={id}
        data-quick-input
        ref={textareaRef}
        rows={rows}
        className="glass-input glass-textarea relative w-full resize-y border-transparent bg-transparent text-transparent caret-kash-ink"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          onCursorChange?.(e.target.selectionStart ?? 0);
        }}
        onSelect={syncCursor}
        onKeyUp={syncCursor}
        onClick={syncCursor}
        onFocus={syncCursor}
        onKeyDown={onKeyDown}
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
      />
    </div>
  );
});

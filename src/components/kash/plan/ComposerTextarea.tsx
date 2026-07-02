"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  type FocusEvent,
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
  onFocus?: (e: FocusEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: FocusEvent<HTMLTextAreaElement>) => void;
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
    onFocus,
    onBlur,
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
    <span className="text-ink-muted/50 italic">{ghostSuffix}</span>
  ) : null;

  return (
    <div className="relative">
      <div
        ref={mirrorRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 min-h-14 w-full overflow-hidden whitespace-pre-wrap break-words rounded-control border border-transparent bg-transparent px-3 py-2 text-body text-ink [field-sizing:content]"
      >
        {value}
        {ghostText}
      </div>
      <textarea
        id={id}
        data-quick-input
        ref={textareaRef}
        rows={rows}
        className="relative min-h-14 w-full resize-y rounded-control border border-transparent bg-transparent px-3 py-2 text-body text-transparent caret-ink outline-none transition-shadow [field-sizing:content] focus:shadow-[0_0_0_2px_var(--focus-ring)]"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          onCursorChange?.(e.target.selectionStart ?? 0);
        }}
        onSelect={syncCursor}
        onKeyUp={syncCursor}
        onClick={syncCursor}
        onFocus={(e) => {
          syncCursor();
          onFocus?.(e);
        }}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
      />
    </div>
  );
});

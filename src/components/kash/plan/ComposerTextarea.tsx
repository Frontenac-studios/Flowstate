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
  /**
   * Opt into the shared composer Enter policy (D4): plain Enter (or ⌘/Ctrl+Enter)
   * submits, Shift+Enter inserts a newline. Pasting multi-line text is unaffected —
   * a paste inserts newlines through onChange, never firing this Enter handler.
   */
  submitOnEnter?: boolean;
  onSubmit?: () => void;
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
    submitOnEnter = false,
    onSubmit,
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

  // Keep the visible ghost-text overlay aligned with the textarea once the
  // content grows past the height cap and the textarea starts scrolling.
  const syncScroll = useCallback(() => {
    const el = textareaRef.current;
    const mirror = mirrorRef.current;
    if (!el || !mirror) return;
    mirror.scrollTop = el.scrollTop;
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Shared Enter policy (D4). Shift+Enter always falls through to a newline.
      // The isComposing guard keeps an IME candidate-confirming Enter from submitting.
      if (
        submitOnEnter &&
        e.key === "Enter" &&
        !e.shiftKey &&
        !e.nativeEvent.isComposing &&
        onSubmit
      ) {
        e.preventDefault();
        onSubmit();
        return;
      }
      onKeyDown?.(e);
    },
    [submitOnEnter, onSubmit, onKeyDown]
  );

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
        className="pointer-events-none absolute inset-0 max-h-[40vh] min-h-14 w-full overflow-hidden whitespace-pre-wrap break-words rounded-control border border-transparent bg-transparent px-3 py-2 text-body text-ink [field-sizing:content]"
      >
        {value}
        {ghostText}
      </div>
      <textarea
        id={id}
        data-quick-input
        ref={textareaRef}
        rows={rows}
        className="relative max-h-[40vh] min-h-14 w-full resize-y overflow-y-auto rounded-control border border-transparent bg-transparent px-3 py-2 text-body text-transparent caret-ink outline-none transition-shadow [field-sizing:content] focus:shadow-[0_0_0_2px_var(--focus-ring)]"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          onCursorChange?.(e.target.selectionStart ?? 0);
          syncScroll();
        }}
        onScroll={syncScroll}
        onSelect={syncCursor}
        onKeyUp={syncCursor}
        onClick={syncCursor}
        onFocus={(e) => {
          syncCursor();
          onFocus?.(e);
        }}
        onBlur={onBlur}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
      />
    </div>
  );
});

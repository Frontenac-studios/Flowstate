"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

import { cn } from "@/lib/cn";
import type { ComposerProperty } from "@/lib/parser/composer-assist";
import {
  type AssistConfig,
  computeAssist,
  getAcceptInsertText,
  getLineAtCursor,
  shouldAppendSemicolonAfterAccept,
} from "@/lib/parser/composer-assist-core";

export type ComposerAssistInputHandle = { focus: () => void };

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Which composer properties this input accepts (built via `buildComposerConfig`). */
  config: AssistConfig<ComposerProperty>;
  /** Classes for the input; the ghost mirror reuses them so metrics line up. */
  className?: string;
  /** Classes for the positioning wrapper (e.g. flex sizing). */
  wrapperClassName?: string;
  ghostClassName?: string;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
  id?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  onFocus?: (e: FocusEvent<HTMLInputElement>) => void;
  onClick?: (e: MouseEvent<HTMLInputElement>) => void;
};

/**
 * Single-line input with the composer's ghost-text + Tab-accept model, so
 * inline surfaces (task title edit, backlog capture) get the same `title; due;
 * !priority; #project` autocomplete as the main QuickInput. The mirror overlay
 * is fully transparent and paints only the ghost suffix, so it layers over the
 * input's own styling without needing to match its background or border.
 */
export const ComposerAssistInput = forwardRef<ComposerAssistInputHandle, Props>(
  function ComposerAssistInput(
    {
      value,
      onChange,
      config,
      className,
      wrapperClassName = "relative block",
      ghostClassName = "text-ink-muted/60 italic",
      placeholder,
      disabled,
      maxLength,
      autoFocus,
      id,
      onKeyDown,
      onBlur,
      onFocus,
      onClick,
      ...aria
    },
    ref
  ) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [cursor, setCursor] = useState(0);

    useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }));

    const assist = useMemo(() => {
      const { lineText, cursorInLine } = getLineAtCursor(value, cursor);
      return computeAssist(lineText, cursorInLine, config);
    }, [value, cursor, config]);

    const ghostSuffix = assist.suggestionSuffix;

    const syncCursor = useCallback(() => {
      setCursor(inputRef.current?.selectionStart ?? 0);
    }, []);

    const acceptSuggestion = useCallback((): boolean => {
      const el = inputRef.current;
      if (!el) return false;

      const domValue = el.value;
      const start = el.selectionStart ?? domValue.length;
      const { lineText, cursorInLine } = getLineAtCursor(domValue, start);
      const domAssist = computeAssist(lineText, cursorInLine, config);
      const insert = getAcceptInsertText(domAssist);
      if (!insert) return false;

      const end = el.selectionEnd ?? start;
      const before = domValue.slice(0, start);
      const after = domValue.slice(end);
      let next = before + insert + after;

      const appendSemi = shouldAppendSemicolonAfterAccept(
        config.order,
        lineText,
        cursorInLine + insert.length,
        domAssist
      );
      if (appendSemi) next = `${before + insert}; ${after}`;

      const newCursor = start + insert.length + (appendSemi ? 2 : 0);
      onChange(next);
      setCursor(newCursor);
      requestAnimationFrame(() => el.setSelectionRange(newCursor, newCursor));
      return true;
    }, [config, onChange]);

    return (
      <span className={wrapperClassName}>
        <span
          aria-hidden
          className={cn(
            className,
            "pointer-events-none absolute inset-0 overflow-hidden whitespace-pre"
          )}
          style={{ background: "transparent", borderColor: "transparent", color: "transparent" }}
        >
          {value}
          {ghostSuffix ? <span className={ghostClassName}>{ghostSuffix}</span> : null}
        </span>
        <input
          {...aria}
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          className={cn(className, "relative")}
          onChange={(e) => {
            onChange(e.target.value);
            setCursor(e.target.selectionStart ?? 0);
          }}
          onSelect={syncCursor}
          onKeyUp={syncCursor}
          onClick={(e) => {
            syncCursor();
            onClick?.(e);
          }}
          onFocus={(e) => {
            syncCursor();
            onFocus?.(e);
          }}
          onBlur={onBlur}
          onKeyDown={(e) => {
            if (e.key === "Tab" && !e.shiftKey && acceptSuggestion()) {
              e.preventDefault();
              return;
            }
            onKeyDown?.(e);
          }}
        />
      </span>
    );
  }
);

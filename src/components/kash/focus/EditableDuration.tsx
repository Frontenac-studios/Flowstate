"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { parseDurationInput } from "@/lib/focus/parse-duration";

import { timeString } from "./timeString";

type Props = {
  seconds: number;
  onCommit: (seconds: number) => void;
  disabled?: boolean;
  className?: string;
  size?: "lg" | "md";
};

export function EditableDuration({
  seconds,
  onCommit,
  disabled = false,
  className = "",
  size = "lg",
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(timeString(seconds));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(timeString(seconds));
  }, [seconds, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = useCallback(() => {
    const parsed = parseDurationInput(draft);
    setEditing(false);
    if (parsed != null) onCommit(parsed);
    else setDraft(timeString(seconds));
  }, [draft, onCommit, seconds]);

  const textClass =
    size === "lg"
      ? "font-mono text-5xl font-medium tabular-nums sm:text-6xl"
      : "font-mono text-3xl font-medium tabular-nums";

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            setEditing(false);
            setDraft(timeString(seconds));
          }
        }}
        className={`w-[5.5em] border-b-2 border-ink bg-transparent text-center text-ink outline-none ${textClass} ${className}`}
        aria-label="Edit duration"
      />
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        setDraft(timeString(seconds));
        setEditing(true);
      }}
      className={`rounded-chip text-ink transition hover:bg-[var(--accent-soft)] focus:outline-none focus-visible:shadow-[inset_0_0_0_var(--focus-ring-width)_var(--ink)] disabled:cursor-default disabled:hover:bg-transparent ${textClass} ${className}`}
      title="Click to edit duration"
      aria-label={`Duration ${timeString(seconds)}. Click to edit.`}
    >
      {timeString(seconds)}
    </button>
  );
}

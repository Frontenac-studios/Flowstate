"use client";

import { useState } from "react";

type Props = {
  onCreateTask: (title: string) => void;
  onCreatePhase: (name: string) => void;
  pending: boolean;
};

export default function NewItemRow({ onCreateTask, onCreatePhase, pending }: Props) {
  const [value, setValue] = useState("");
  const [isPhase, setIsPhase] = useState(false);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (isPhase) onCreatePhase(trimmed);
    else onCreateTask(trimmed);
    setValue("");
  };

  return (
    <div className="mt-1 flex items-center gap-1.5">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        disabled={pending}
        placeholder={isPhase ? "+ new phase" : "+ new task"}
        className="glass-input flex-1 py-1.5 text-sm"
        aria-label={isPhase ? "New phase name" : "New task title"}
      />
      <button
        type="button"
        onClick={() => setIsPhase((v) => !v)}
        aria-pressed={isPhase}
        title="Create as a phase instead of a task"
        className={`shrink-0 rounded-full border px-2 py-1 text-xs font-medium transition ${
          isPhase
            ? "border-kash-accent bg-kash-accent text-white"
            : "border-transparent bg-white/50 text-kash-ink-muted hover:text-kash-ink"
        }`}
      >
        Phase
      </button>
    </div>
  );
}

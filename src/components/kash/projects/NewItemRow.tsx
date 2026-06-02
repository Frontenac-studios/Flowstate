"use client";

import { useMemo, useRef, useState } from "react";

import {
  isProjectTaskLineValid,
  parseProjectTaskInput,
} from "@/lib/parser/parse-project-task-input";
import {
  getProjectAcceptInsertText,
  getProjectComposerAssist,
  shouldAppendSemicolonAfterProjectAccept,
} from "@/lib/parser/project-composer-assist";
import { findPhaseByName } from "@/lib/projects/find-phase-by-name";

import ProjectParseError from "./ProjectParseError";
import ProjectParsePreview from "./ProjectParsePreview";
import ProjectPropertyBar from "./ProjectPropertyBar";
import type { ProjectPhase } from "./types";

export type ResolvedProjectTaskInput = {
  title: string;
  scheduledDate: string | null;
  bucketOverride: "later" | null;
  priority: 0 | 1 | 2 | 3;
  phaseId: string | null;
};

type Props = {
  projectSlug: string;
  phases: ProjectPhase[];
  defaultPhaseId: string | null;
  onCreateTask: (result: ResolvedProjectTaskInput) => void;
  onCreatePhase: (name: string) => void;
  pending: boolean;
};

export default function NewItemRow({
  projectSlug,
  phases,
  defaultPhaseId,
  onCreateTask,
  onCreatePhase,
  pending,
}: Props) {
  const [value, setValue] = useState("");
  const [isPhase, setIsPhase] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const phaseRefs = useMemo(() => phases.map((p) => ({ id: p.id, name: p.name })), [phases]);

  const parseCtx = useMemo(
    () => ({ currentProjectSlug: projectSlug, phases: phaseRefs }),
    [projectSlug, phaseRefs]
  );

  const parse = useMemo(
    () => (isPhase ? null : parseProjectTaskInput(value, parseCtx)),
    [value, parseCtx, isPhase]
  );

  const cursor = value.length;
  const assist = useMemo(
    () => (isPhase ? null : getProjectComposerAssist(value, cursor, parseCtx)),
    [value, cursor, parseCtx, isPhase]
  );

  const showPropertyBar =
    !isPhase && assist !== null && (focused || value.trim().length > 0) && assist.inSemicolonMode;

  const acceptSuggestion = (): boolean => {
    if (isPhase || !assist) return false;
    const insert = getProjectAcceptInsertText(assist);
    if (!insert) return false;

    const el = inputRef.current;
    if (!el) return false;

    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? start;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const appendSemi = shouldAppendSemicolonAfterProjectAccept(
      value,
      start + insert.length,
      assist
    );
    let next = before + insert + after;
    let newCursor = start + insert.length;
    if (appendSemi) {
      next = `${before + insert}; ${after}`;
      newCursor += 2;
    }

    setValue(next);
    requestAnimationFrame(() => {
      el.setSelectionRange(newCursor, newCursor);
    });
    return true;
  };

  const resolvePhaseId = (parentDirName: string | null): string | null => {
    if (!parentDirName) return defaultPhaseId;
    const result = findPhaseByName(phaseRefs, parentDirName);
    if (result.kind === "found") return result.phaseId;
    return defaultPhaseId;
  };

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;

    if (isPhase) {
      onCreatePhase(trimmed);
      setValue("");
      return;
    }

    if (!parse || !isProjectTaskLineValid(parse)) return;

    onCreateTask({
      title: parse.title,
      scheduledDate: parse.scheduledDate,
      bucketOverride: parse.bucketOverride,
      priority: parse.priority,
      phaseId: resolvePhaseId(parse.parentDirName),
    });
    setValue("");
  };

  return (
    <div className="mt-1 flex flex-col gap-0.5">
      {showPropertyBar && assist ? <ProjectPropertyBar assist={assist} visible /> : null}
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
              return;
            }
            if (e.key === "Tab" && !e.shiftKey && acceptSuggestion()) {
              e.preventDefault();
            }
          }}
          disabled={pending}
          placeholder={isPhase ? "+ new phase" : "+ task; due; priority; project; parent dir"}
          className="glass-input flex-1 py-1.5 text-sm"
          aria-label={isPhase ? "New phase name" : "New task"}
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
      {!isPhase && parse && value.trim() ? (
        <>
          <ProjectParsePreview parse={parse} />
          <ProjectParseError warnings={parse.warnings} />
        </>
      ) : null}
    </div>
  );
}

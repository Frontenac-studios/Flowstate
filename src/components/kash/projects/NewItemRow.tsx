"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";

import { getLineAtCursor } from "@/lib/parser/composer-assist";
import {
  isProjectTaskLineValid,
  MAX_COMPOSER_LINES,
  parseProjectTaskInputLines,
  type ParsedProjectLine,
} from "@/lib/parser/parse-project-task-input";
import {
  getProjectAcceptInsertText,
  getProjectComposerAssistFromValue,
  shouldAppendSemicolonAfterProjectAccept,
} from "@/lib/parser/project-composer-assist";
import { findPhaseByName } from "@/lib/projects/find-phase-by-name";

import { ComposerTextarea, type ComposerTextareaHandle } from "../plan/ComposerTextarea";

import ProjectComposerLineErrors from "./ProjectComposerLineErrors";
import ProjectMultiLineParsePreview from "./ProjectMultiLineParsePreview";
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
  onBulkCreateTasks: (tasks: ResolvedProjectTaskInput[]) => void;
  onCreatePhase: (name: string) => void;
  pending: boolean;
};

export default function NewItemRow({
  projectSlug,
  phases,
  defaultPhaseId,
  onCreateTask,
  onBulkCreateTasks,
  onCreatePhase,
  pending,
}: Props) {
  const [value, setValue] = useState("");
  const [cursor, setCursor] = useState(0);
  const [isPhase, setIsPhase] = useState(false);
  const [lineLimitWarning, setLineLimitWarning] = useState(false);
  const textareaRef = useRef<ComposerTextareaHandle>(null);
  const inputId = useId();

  const phaseRefs = useMemo(() => phases.map((p) => ({ id: p.id, name: p.name })), [phases]);

  const parseCtx = useMemo(
    () => ({ currentProjectSlug: projectSlug, phases: phaseRefs }),
    [projectSlug, phaseRefs]
  );

  const parsedLines = useMemo(
    () => (isPhase ? [] : parseProjectTaskInputLines(value, parseCtx)),
    [value, parseCtx, isPhase]
  );

  const assist = useMemo(
    () => (isPhase ? null : getProjectComposerAssistFromValue(value, cursor, parseCtx)),
    [value, cursor, parseCtx, isPhase]
  );

  const acceptSuggestion = useCallback((): boolean => {
    if (isPhase || !assist) return false;

    const el = textareaRef.current?.getTextarea();
    if (!el) return false;

    const domValue = el.value;
    const start = el.selectionStart ?? 0;
    const domAssist = getProjectComposerAssistFromValue(domValue, start, parseCtx);
    const insert = getProjectAcceptInsertText(domAssist);
    if (!insert) return false;

    const end = el.selectionEnd ?? start;
    const before = domValue.slice(0, start);
    const after = domValue.slice(end);
    let next = before + insert + after;

    const { lineText, cursorInLine } = getLineAtCursor(domValue, start);
    const appendSemi = shouldAppendSemicolonAfterProjectAccept(
      lineText,
      cursorInLine + insert.length,
      domAssist
    );
    if (appendSemi) {
      next = `${before + insert}; ${after}`;
    }

    const newCursor = start + insert.length + (appendSemi ? 2 : 0);
    setValue(next);
    setCursor(newCursor);
    requestAnimationFrame(() => {
      textareaRef.current?.setSelectionRange(newCursor, newCursor);
    });
    return true;
  }, [isPhase, assist, parseCtx]);

  const resolvePhaseId = (parentDirName: string | null): string | null => {
    if (!parentDirName) return defaultPhaseId;
    const result = findPhaseByName(phaseRefs, parentDirName);
    if (result.kind === "found") return result.phaseId;
    return defaultPhaseId;
  };

  const lineToResolved = (line: ParsedProjectLine): ResolvedProjectTaskInput => ({
    title: line.parse.title,
    scheduledDate: line.parse.scheduledDate,
    bucketOverride: line.parse.bucketOverride,
    priority: line.parse.priority,
    phaseId: resolvePhaseId(line.parse.parentDirName),
  });

  const submitPhase = () => {
    const trimmed = value.trim().split("\n")[0]?.trim() ?? "";
    if (!trimmed) return;
    onCreatePhase(trimmed);
    setValue("");
  };

  const submitTasks = () => {
    if (!value.trim() || pending) return;

    if (parsedLines.length > MAX_COMPOSER_LINES) {
      setLineLimitWarning(true);
      return;
    }
    setLineLimitWarning(false);

    const valid = parsedLines.filter((line) => isProjectTaskLineValid(line.parse));
    if (valid.length === 0) return;

    if (valid.length === 1) {
      onCreateTask(lineToResolved(valid[0]!));
      setValue("");
      return;
    }

    onBulkCreateTasks(valid.map(lineToResolved));
    const invalid = parsedLines.filter((line) => !isProjectTaskLineValid(line.parse));
    setValue(invalid.map((l) => l.raw).join("\n"));
  };

  const handleSubmit = () => {
    if (isPhase) {
      submitPhase();
    } else {
      submitTasks();
    }
  };

  const singleLineParse = parsedLines.length === 1 ? parsedLines[0]?.parse : null;

  return (
    <div className="mt-1 flex flex-col">
      {!isPhase && assist ? <ProjectPropertyBar assist={assist} visible /> : null}

      <div className="mb-1.5 flex items-center justify-end">
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

      <ComposerTextarea
        ref={textareaRef}
        id={inputId}
        value={value}
        onChange={setValue}
        onCursorChange={setCursor}
        ghostSuffix={isPhase ? null : (assist?.suggestionSuffix ?? null)}
        placeholder={
          isPhase ? "+ new phase" : "add tasks — one per line. Use `;` for properties. ⌘↵ to add."
        }
        disabled={pending}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit();
            return;
          }
          if (isPhase && e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            submitPhase();
            return;
          }
          if (e.key === "Tab" && !e.shiftKey && acceptSuggestion()) {
            e.preventDefault();
          }
        }}
      />

      <p className="mt-1.5 text-xs text-kash-ink-muted">
        {isPhase ? "Enter to add phase" : "Enter for new line · ⌘↵ to add tasks"}
        {!isPhase && assist?.suggestionSuffix ? " · ⇥ accept suggestion" : null}
        {pending ? " · Adding…" : null}
      </p>

      {lineLimitWarning ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          Too many lines — add at most {MAX_COMPOSER_LINES} tasks at once.
        </p>
      ) : null}

      {!isPhase && value.trim() ? (
        parsedLines.length === 1 && singleLineParse ? (
          <ProjectParsePreview parse={singleLineParse} />
        ) : parsedLines.length > 1 ? (
          <ProjectMultiLineParsePreview lines={parsedLines} />
        ) : null
      ) : null}

      {!isPhase ? <ProjectComposerLineErrors lines={parsedLines} /> : null}
    </div>
  );
}

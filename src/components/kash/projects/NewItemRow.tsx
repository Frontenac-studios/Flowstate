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
import type { PhaseRef } from "@/lib/projects/find-phase-by-name";

import { ComposerTextarea, type ComposerTextareaHandle } from "../plan/ComposerTextarea";

import ProjectComposerLineErrors from "./ProjectComposerLineErrors";
import ProjectMultiLineParsePreview from "./ProjectMultiLineParsePreview";
import ProjectParsePreview from "./ProjectParsePreview";
import ProjectPropertyBar from "./ProjectPropertyBar";
import type { ProjectPhase } from "./types";

type Props = {
  phases: ProjectPhase[];
  onSubmitComposer: (lines: ParsedProjectLine[]) => Promise<void>;
  pending: boolean;
};

export default function NewItemRow({ phases, onSubmitComposer, pending }: Props) {
  const [value, setValue] = useState("");
  const [cursor, setCursor] = useState(0);
  const [lineLimitWarning, setLineLimitWarning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<ComposerTextareaHandle>(null);
  const inputId = useId();

  const phaseRefs = useMemo(
    (): PhaseRef[] =>
      phases.map((p) => ({ id: p.id, name: p.name, parentPhaseId: p.parentPhaseId })),
    [phases]
  );

  const parseCtx = useMemo(
    () => ({
      phases: phaseRefs,
      parentPhaseId: null,
    }),
    [phaseRefs]
  );

  const parsedLines = useMemo(() => parseProjectTaskInputLines(value, parseCtx), [value, parseCtx]);

  const assist = useMemo(
    () => getProjectComposerAssistFromValue(value, cursor, parseCtx),
    [value, cursor, parseCtx]
  );

  const cursorOnPlusParentDirLine = useMemo(() => {
    const { lineText } = getLineAtCursor(value, cursor);
    if (!lineText.includes(";")) return false;
    const segment = lineText.split(";")[3]?.trim() ?? "";
    return /\+/.test(segment);
  }, [value, cursor]);

  const acceptSuggestion = useCallback((): boolean => {
    if (cursorOnPlusParentDirLine || !assist) return false;

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
  }, [cursorOnPlusParentDirLine, assist, parseCtx]);

  const submitTasks = async () => {
    if (!value.trim() || pending || submitting) return;

    if (parsedLines.length > MAX_COMPOSER_LINES) {
      setLineLimitWarning(true);
      return;
    }
    setLineLimitWarning(false);

    const valid = parsedLines.filter((line) => isProjectTaskLineValid(line.parse));
    if (valid.length === 0) return;

    setSubmitting(true);
    try {
      await onSubmitComposer(valid);
      const invalid = parsedLines.filter((line) => !isProjectTaskLineValid(line.parse));
      setValue(invalid.map((l) => l.raw).join("\n"));
    } finally {
      setSubmitting(false);
    }
  };

  const singleLineParse = parsedLines.length === 1 ? parsedLines[0]?.parse : null;
  const isBusy = pending || submitting;

  return (
    <div className="mt-1 flex flex-col">
      {assist && !cursorOnPlusParentDirLine ? <ProjectPropertyBar assist={assist} visible /> : null}

      <ComposerTextarea
        ref={textareaRef}
        id={inputId}
        value={value}
        onChange={setValue}
        onCursorChange={setCursor}
        ghostSuffix={cursorOnPlusParentDirLine ? null : (assist?.suggestionSuffix ?? null)}
        placeholder="add tasks — parent dir: Phase or Parent//+ Child for subdirectories"
        disabled={isBusy}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void submitTasks();
            return;
          }
          if (e.key === "Tab" && !e.shiftKey && acceptSuggestion()) {
            e.preventDefault();
          }
        }}
      />

      <p className="mt-1.5 text-xs text-kash-ink-muted">
        Enter for new line · ⌘↵ to add tasks
        {!cursorOnPlusParentDirLine && assist?.suggestionSuffix ? " · ⇥ accept suggestion" : null}
        {isBusy ? " · Adding…" : null}
      </p>

      {lineLimitWarning ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          Too many lines — add at most {MAX_COMPOSER_LINES} tasks at once.
        </p>
      ) : null}

      {value.trim() ? (
        parsedLines.length === 1 && singleLineParse ? (
          <ProjectParsePreview parse={singleLineParse} />
        ) : parsedLines.length > 1 ? (
          <ProjectMultiLineParsePreview lines={parsedLines} />
        ) : null
      ) : null}

      <ProjectComposerLineErrors lines={parsedLines} />
    </div>
  );
}

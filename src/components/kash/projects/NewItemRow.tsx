"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";

import { useComposerDraft } from "@/hooks/useComposerDraft";
import { projectComposerDraftScope } from "@/lib/composer/composer-draft-constants";
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
import {
  buildComposerLeafPhaseIdByPathKey,
  resolveComposerLinePhaseIdSync,
} from "@/lib/projects/resolve-composer-line-phase-id";
import { detectDuplicateTaskWarnings } from "@/lib/tasks/detect-duplicate-task-warnings";
import { getTaskTitleError } from "@/lib/taskValidation";

import ComposerDuplicateWarnings from "../composer/ComposerDuplicateWarnings";
import { ComposerTextarea, type ComposerTextareaHandle } from "../plan/ComposerTextarea";

import ProjectComposerLineErrors from "./ProjectComposerLineErrors";
import ProjectMultiLineParsePreview from "./ProjectMultiLineParsePreview";
import ProjectParsePreview from "./ProjectParsePreview";
import ProjectPropertyBar from "./ProjectPropertyBar";
import type { ProjectPhase, ProjectTask } from "./types";

type Props = {
  projectId: string;
  phases: ProjectPhase[];
  tasks: ProjectTask[];
  defaultPhaseId: string | null;
  onSubmitComposer: (lines: ParsedProjectLine[]) => Promise<void>;
  pending: boolean;
};

export default function NewItemRow({
  projectId,
  phases,
  tasks,
  defaultPhaseId,
  onSubmitComposer,
  pending,
}: Props) {
  const [value, setValue] = useComposerDraft(projectComposerDraftScope(projectId));
  const [cursor, setCursor] = useState(0);
  const [lineLimitWarning, setLineLimitWarning] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<ComposerTextareaHandle>(null);
  const inputId = useId();

  const phaseRefs = useMemo(
    (): PhaseRef[] =>
      phases.map((p) => ({ id: p.id, name: p.name, parentPhaseId: p.parentPhaseId })),
    [phases]
  );

  const phaseLookup = useMemo(
    () => phaseRefs.map((phase) => ({ phaseId: phase.id, name: phase.name })),
    [phaseRefs]
  );

  const parseCtx = useMemo(
    () => ({
      phases: phaseRefs,
      parentPhaseId: null,
    }),
    [phaseRefs]
  );

  const parsedLines = useMemo(() => parseProjectTaskInputLines(value, parseCtx), [value, parseCtx]);

  const duplicateWarnings = useMemo(() => {
    if (parsedLines.length === 0) return [];

    const resolveParams = {
      phases: phaseRefs,
      defaultPhaseId,
      parentPhaseId: null,
      allLines: parsedLines,
    };
    const leafPhaseIdByPathKey = buildComposerLeafPhaseIdByPathKey(parsedLines, phaseRefs, null);

    return detectDuplicateTaskWarnings({
      lines: parsedLines
        .filter((line) => !line.parse.phaseOnly)
        .map((line) => {
          const { phaseId, skipExistingCheck } = resolveComposerLinePhaseIdSync(line, {
            ...resolveParams,
            leafPhaseIdByPathKey,
          });
          return {
            lineIndex: line.lineIndex,
            title: line.parse.title,
            projectId,
            phaseId,
            skipExistingCheck,
          };
        }),
      existingTasks: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        projectId: task.projectId,
        phaseId: task.phaseId,
        completedAt: task.completedAt,
      })),
    });
  }, [parsedLines, phaseRefs, defaultPhaseId, projectId, tasks]);

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
  }, [cursorOnPlusParentDirLine, assist, parseCtx, setValue]);

  const submitTasks = async () => {
    if (!value.trim() || pending || submitting) return;
    setSubmitError(null);

    if (parsedLines.length > MAX_COMPOSER_LINES) {
      setLineLimitWarning(true);
      return;
    }
    setLineLimitWarning(false);

    const valid = parsedLines.filter((line) => isProjectTaskLineValid(line.parse));
    if (valid.length === 0) return;

    const titleError = valid
      .filter((line) => !line.parse.phaseOnly)
      .map((line) => getTaskTitleError(line.parse.title))
      .find((error) => error !== null);
    if (titleError) {
      setSubmitError(titleError);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitComposer(valid);
      const invalid = parsedLines.filter((line) => !isProjectTaskLineValid(line.parse));
      setValue(invalid.map((l) => l.raw).join("\n"));
    } catch {
      setSubmitError("Couldn't add your tasks — please try again.");
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
        placeholder="add tasks — parent dir: Phase or Parent//+ Child · ;;; + Phase for directories only"
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

      {submitError ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {submitError}
        </p>
      ) : null}

      {value.trim() ? (
        parsedLines.length === 1 && singleLineParse ? (
          <ProjectParsePreview parse={singleLineParse} />
        ) : parsedLines.length > 1 ? (
          <ProjectMultiLineParsePreview lines={parsedLines} />
        ) : null
      ) : null}

      <ComposerDuplicateWarnings
        warnings={duplicateWarnings}
        phases={phaseLookup}
        context="project"
      />

      <ProjectComposerLineErrors lines={parsedLines} />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { useComposerDraft } from "@/hooks/useComposerDraft";
import { projectComposerDraftScope } from "@/lib/composer/composer-draft-constants";
import { getLineAtCursor } from "@/lib/parser/composer-assist";
import {
  isProjectTaskLineValid,
  MAX_COMPOSER_LINES,
  parseProjectTaskInputLines,
  removeSubmittedLines,
  type ParsedProjectLine,
  type ProjectParseWarning,
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
import { describeComposerSubmitError } from "@/lib/projects/describe-composer-submit-error";
import { detectDuplicateTaskWarnings } from "@/lib/tasks/detect-duplicate-task-warnings";
import { getTaskTitleError } from "@/lib/taskValidation";

import ComposerDuplicateWarnings from "../composer/ComposerDuplicateWarnings";
import ComposerLineErrors, { type ComposerLineErrorGroup } from "../composer/ComposerLineErrors";
import { ComposerTextarea, type ComposerTextareaHandle } from "../plan/ComposerTextarea";

import ProjectMultiLineParsePreview from "./ProjectMultiLineParsePreview";
import ProjectParsePreview from "./ProjectParsePreview";
import ProjectPropertyBar from "./ProjectPropertyBar";
import type { ProjectPhase, ProjectTask } from "./types";

function projectWarningMessage(warning: ProjectParseWarning): string {
  switch (warning.code) {
    case "invalid_property":
      return `Invalid ${warning.field}: "${warning.property}"`;
    case "phase_not_found":
      if (warning.underParent) {
        return `No phase "${warning.name}" under "${warning.underParent}"`;
      }
      return `No phase named "${warning.name}"`;
    case "phase_ambiguous":
      return `Ambiguous phase "${warning.name}" (${warning.matches.join(", ")})`;
    case "empty_phase_name":
      return "Parent directory name is required after +";
  }
}

function projectLineLabel(line: ParsedProjectLine): string {
  const title = line.parse.title || line.raw;
  return title.length > 40 ? `${title.slice(0, 40)}…` : title;
}

/** Adapt the project composer's parsed lines into the shared line-error view model. */
function buildProjectLineErrorGroups(lines: ParsedProjectLine[]): ComposerLineErrorGroup[] {
  return lines
    .filter((line) => line.parse.warnings.length > 0)
    .map((line) => ({
      key: line.lineIndex,
      label: projectLineLabel(line),
      messages: line.parse.warnings.map((warning, i) => ({
        key: `${warning.code}-${i}`,
        text: projectWarningMessage(warning),
      })),
    }));
}

type Props = {
  projectId: string;
  phases: ProjectPhase[];
  tasks: ProjectTask[];
  defaultPhaseId: string | null;
  onSubmitComposer: (lines: ParsedProjectLine[]) => Promise<void>;
  pending: boolean;
  onFocusChange?: (focused: boolean) => void;
  /** Focus the composer on mount — used when revealed from the collapsed "+". */
  autoFocus?: boolean;
};

export default function NewItemRow({
  projectId,
  phases,
  tasks,
  defaultPhaseId,
  onSubmitComposer,
  pending,
  onFocusChange,
  autoFocus = false,
}: Props) {
  const [value, setValue] = useComposerDraft(projectComposerDraftScope(projectId));
  const [cursor, setCursor] = useState(0);
  const [lineLimitWarning, setLineLimitWarning] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitNotice, setSubmitNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<ComposerTextareaHandle>(null);
  const inputId = useId();

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

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
    setSubmitNotice(null);

    if (parsedLines.length > MAX_COMPOSER_LINES) {
      setLineLimitWarning(true);
      return;
    }
    setLineLimitWarning(false);

    const valid = parsedLines.filter((line) => isProjectTaskLineValid(line.parse));
    // Lines dropped because they carry a blocking warning (bad due/priority, or a
    // parent dir that doesn't resolve). Their reasons render in the list below, so
    // point the user there rather than silently doing nothing.
    const skipped = parsedLines.length - valid.length;
    if (valid.length === 0) {
      setSubmitError(
        skipped === 1
          ? "That line can't be added yet — fix the issue shown below."
          : "None of these lines can be added yet — fix the issues shown below."
      );
      return;
    }

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
      setValue(removeSubmittedLines(value, valid));
      const added = valid.filter((line) => !line.parse.phaseOnly).length;
      if (skipped > 0) {
        // Partial success: the skipped lines stay in the box with their reasons.
        setSubmitNotice(`Added ${added} — skipped ${skipped} with issues (see below).`);
      }
    } catch (error) {
      console.error("Project composer submit failed", error);
      setSubmitError(describeComposerSubmitError(error));
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
        onChange={(next) => {
          if (submitError) setSubmitError(null);
          if (submitNotice) setSubmitNotice(null);
          setValue(next);
        }}
        onCursorChange={setCursor}
        ghostSuffix={cursorOnPlusParentDirLine ? null : (assist?.suggestionSuffix ?? null)}
        placeholder="add phases and tasks — one per line"
        disabled={isBusy}
        onFocus={() => onFocusChange?.(true)}
        onBlur={() => onFocusChange?.(false)}
        submitOnEnter
        onSubmit={() => void submitTasks()}
        onKeyDown={(e) => {
          if (e.key === "Tab" && !e.shiftKey && acceptSuggestion()) {
            e.preventDefault();
          }
        }}
      />

      <p className="mt-1.5 text-xs text-ink-muted">
        ↵ to add · ⇧↵ for new line
        {!cursorOnPlusParentDirLine && assist?.suggestionSuffix ? " · ⇥ accept suggestion" : null}
        {isBusy ? " · Adding…" : null}
      </p>

      {lineLimitWarning ? (
        <p className="mt-2 text-sm text-critical" role="alert">
          Too many lines — add at most {MAX_COMPOSER_LINES} tasks at once.
        </p>
      ) : null}

      {submitError ? (
        <p className="mt-2 text-sm text-critical" role="alert">
          {submitError}
        </p>
      ) : null}

      {submitNotice ? (
        <p className="mt-2 text-sm text-ink-muted" role="status">
          {submitNotice}
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

      <ComposerLineErrors groups={buildProjectLineErrorGroups(parsedLines)} />
    </div>
  );
}

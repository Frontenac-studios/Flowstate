"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from "react";

import { useComposerDraft } from "@/hooks/useComposerDraft";
import {
  getAcceptInsertText,
  getComposerAssistFromValue,
  getLineAtCursor,
  readLastProjectSlug,
  shouldAppendSemicolonAfterAccept,
  writeLastProjectSlug,
} from "@/lib/parser/composer-assist";
import {
  isLineProjectValid,
  MAX_COMPOSER_LINES,
  parseQuickInputLines,
  replaceComposerLineAtIndex,
  type ParsedLine,
} from "@/lib/parser/parse-quick-input";
import { deriveBucket } from "@/lib/tasks/derive-bucket";
import { detectDuplicateTaskWarnings } from "@/lib/tasks/detect-duplicate-task-warnings";
import type { TaskCreatedPulse } from "@/lib/tasks/resolve-pulse-target";
import { getTaskTitleError } from "@/lib/taskValidation";
import { useTRPC } from "@/trpc/client";

import ComposerDuplicateWarnings from "../composer/ComposerDuplicateWarnings";

import { ComposerLineErrors } from "./ComposerLineErrors";
import { ComposerPropertyBar } from "./ComposerPropertyBar";
import { ComposerTextarea, type ComposerTextareaHandle } from "./ComposerTextarea";
import { MultiLineParsePreview, ParsePreviewChips } from "./ParsePreviewChips";

export type QuickInputHandle = {
  focus: () => void;
  acceptSuggestion: () => boolean;
};

type Props = {
  draftStorageKey: string;
  onTaskCreated?: (pulse: TaskCreatedPulse) => void;
  /** When true, new tasks without an explicit date land in the inbox (scheduledDate null). */
  createInInbox?: boolean;
};

function replaceProjectSlugInLine(raw: string, fromSlug: string, toSlug: string): string {
  return raw.replace(new RegExp(`#?${fromSlug}\\b`, "i"), toSlug);
}

export const QuickInput = forwardRef<QuickInputHandle, Props>(function QuickInput(
  { draftStorageKey, onTaskCreated, createInInbox = false },
  ref
) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const textareaRef = useRef<ComposerTextareaHandle>(null);
  const [value, setValue] = useComposerDraft(draftStorageKey);
  const [cursor, setCursor] = useState(0);
  const [lineLimitWarning, setLineLimitWarning] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastProjectSlug, setLastProjectSlug] = useState<string | null>(() =>
    readLastProjectSlug()
  );

  const { data: projects = [] } = useQuery(trpc.projects.list.queryOptions());
  const { data: incompleteTasks = [] } = useQuery(trpc.tasks.listIncomplete.queryOptions());

  const projectRefs = useMemo(
    () => projects.map((p) => ({ slug: p.slug, name: p.name })),
    [projects]
  );

  const assistCtx = useMemo(
    () => ({ projects: projectRefs, lastProjectSlug }),
    [projectRefs, lastProjectSlug]
  );

  const assist = useMemo(
    () => getComposerAssistFromValue(value, cursor, assistCtx),
    [value, cursor, assistCtx]
  );

  const acceptSuggestion = useCallback((): boolean => {
    const el = textareaRef.current?.getTextarea();
    if (!el) return false;

    const domValue = el.value;
    const start = el.selectionStart ?? 0;
    const domAssist = getComposerAssistFromValue(domValue, start, assistCtx);
    const insert = getAcceptInsertText(domAssist);
    if (!insert) return false;

    const end = el.selectionEnd ?? start;
    const before = domValue.slice(0, start);
    const after = domValue.slice(end);
    let next = before + insert + after;

    const { lineText, cursorInLine } = getLineAtCursor(domValue, start);
    const appendSemi = shouldAppendSemicolonAfterAccept(
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
  }, [assistCtx, setValue]);

  useImperativeHandle(
    ref,
    () => ({ focus: () => textareaRef.current?.focus(), acceptSuggestion }),
    [acceptSuggestion]
  );

  const parsedLines = useMemo(
    () => parseQuickInputLines(value, { projects: projectRefs }),
    [value, projectRefs]
  );

  const resolveProjectId = useCallback(
    (line: ParsedLine): string | null => {
      if (!line.parse.projectSlug) return null;
      const key = line.parse.projectSlug.toLowerCase();
      return projects.find((p) => p.slug.toLowerCase() === key)?.id ?? null;
    },
    [projects]
  );

  const duplicateWarnings = useMemo(() => {
    if (parsedLines.length === 0) return [];

    return detectDuplicateTaskWarnings({
      lines: parsedLines.map((line) => ({
        lineIndex: line.lineIndex,
        title: line.parse.title,
        projectId: resolveProjectId(line),
        phaseId: null,
      })),
      existingTasks: incompleteTasks.map((task) => ({
        id: task.id,
        title: task.title,
        projectId: task.projectId,
        phaseId: task.phaseId,
        completedAt: task.completedAt,
      })),
    });
  }, [parsedLines, incompleteTasks, resolveProjectId]);

  const persistProjectSlug = useCallback((slug: string | null) => {
    if (!slug) return;
    setLastProjectSlug(slug);
    writeLastProjectSlug(slug);
  }, []);

  const invalidateToday = async () => {
    await queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
    await queryClient.invalidateQueries({ queryKey: trpc.projects.list.queryKey() });
  };

  const createTaskMutation = useMutation(
    trpc.tasks.create.mutationOptions({
      onSuccess: () => void invalidateToday(),
      onError: () => setSubmitError("Couldn't add your tasks — please try again."),
    })
  );

  const resolveScheduledDate = (line: ParsedLine): string | null | undefined => {
    if (line.parse.bucketOverride === "later") return null;
    if (line.parse.scheduledDate != null) return line.parse.scheduledDate;
    if (createInInbox) return null;
    return undefined;
  };

  const createTaskForLine = async (line: ParsedLine) => {
    await createTaskMutation.mutateAsync({
      title: line.parse.title,
      scheduledDate: resolveScheduledDate(line),
      bucketOverride: line.parse.bucketOverride,
      projectId: resolveProjectId(line),
      priority: line.parse.priority,
    });
    persistProjectSlug(line.parse.projectSlug);
  };

  const submitValidLines = async (lines: ParsedLine[]) => {
    const valid = lines.filter((line) => isLineProjectValid(line.parse));
    if (valid.length === 0) return { created: 0, remaining: lines.map((l) => l.raw) };

    for (const line of valid) {
      await createTaskForLine(line);
    }
    await invalidateToday();

    const invalid = lines.filter((line) => !isLineProjectValid(line.parse));
    return {
      created: valid.length,
      remaining: invalid.map((l) => l.raw),
    };
  };

  const handleBulkSubmit = async () => {
    if (!value.trim() || createTaskMutation.isPending) return;
    setSubmitError(null);

    if (parsedLines.length > MAX_COMPOSER_LINES) {
      setLineLimitWarning(true);
      return;
    }
    setLineLimitWarning(false);

    const titleError = parsedLines
      .map((line) => getTaskTitleError(line.parse.title))
      .find((error) => error !== null);
    if (titleError) {
      setSubmitError(titleError);
      return;
    }

    const { created, remaining } = await submitValidLines(parsedLines);

    if (created > 0) {
      const pulses: TaskCreatedPulse[] = [];
      for (const line of parsedLines) {
        if (!isLineProjectValid(line.parse)) continue;
        pulses.push({
          bucket: deriveBucket(
            { scheduledDate: line.parse.scheduledDate, bucketOverride: line.parse.bucketOverride },
            new Date()
          ),
          scheduledDate: line.parse.scheduledDate,
        });
      }
      const pulse =
        pulses.length === 1 ? pulses[0]! : { bucket: "today" as const, scheduledDate: null };
      onTaskCreated?.(pulse);
    }

    setValue(remaining.join("\n"));
  };

  const handleApplySuggestion = (line: ParsedLine, suggestedSlug: string) => {
    const warning = line.parse.warnings.find((w) => w.code === "project_not_found");
    if (!warning) return;
    const newRaw = replaceProjectSlugInLine(line.raw, warning.slug, suggestedSlug);
    setValue((v) => replaceComposerLineAtIndex(v, line.lineIndex, newRaw));
  };

  const singleLineParse = parsedLines.length === 1 ? parsedLines[0]?.parse : null;

  return (
    <section className="glass-panel-opaque p-4">
      <label htmlFor="kash-quick-input" className="sr-only">
        Add tasks
      </label>

      <ComposerPropertyBar assist={assist} visible />

      <ComposerTextarea
        ref={textareaRef}
        id="kash-quick-input"
        value={value}
        onChange={setValue}
        onCursorChange={setCursor}
        ghostSuffix={assist.suggestionSuffix}
        placeholder="add tasks — one per line. Use `;` for properties. ⌘↵ to add."
        disabled={createTaskMutation.isPending}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void handleBulkSubmit();
            return;
          }
          // Tab accepts the inline composer suggestion when one is available;
          // otherwise it falls through to normal focus traversal.
          if (e.key === "Tab" && !e.shiftKey && acceptSuggestion()) {
            e.preventDefault();
          }
        }}
      />

      <p className="mt-1.5 text-xs text-kash-ink-muted">
        Enter for new line · ⌘↵ to add tasks
        {assist.suggestionSuffix ? " · ⇥ accept suggestion" : null}
        {createTaskMutation.isPending ? " · Adding…" : null}
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
          <ParsePreviewChips parse={singleLineParse} />
        ) : parsedLines.length > 1 ? (
          <MultiLineParsePreview lines={parsedLines} />
        ) : null
      ) : null}

      <ComposerDuplicateWarnings warnings={duplicateWarnings} context="plan" />

      <ComposerLineErrors lines={parsedLines} onApplySuggestion={handleApplySuggestion} />
    </section>
  );
});

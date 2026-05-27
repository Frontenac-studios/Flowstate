"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";

import {
  isLineProjectValid,
  MAX_COMPOSER_LINES,
  parseQuickInput,
  parseQuickInputLines,
  removeComposerLineAtIndex,
  replaceComposerLineAtIndex,
  type ParsedLine,
} from "@/lib/parser/parse-quick-input";
import { deriveBucket } from "@/lib/tasks/derive-bucket";
import type { TaskCreatedPulse } from "@/lib/tasks/resolve-pulse-target";
import { useTRPC } from "@/trpc/client";

import { ComposerLineErrors } from "./ComposerLineErrors";
import { MultiLineParsePreview, ParsePreviewChips } from "./ParsePreviewChips";

export type QuickInputHandle = {
  focus: () => void;
};

type Props = {
  onTaskCreated?: (pulse: TaskCreatedPulse) => void;
  /** When true, new tasks without an explicit date land in the inbox (scheduledDate null). */
  createInInbox?: boolean;
};

function replaceProjectSlugInLine(raw: string, fromSlug: string, toSlug: string): string {
  return raw.replace(new RegExp(`#${fromSlug}\\b`, "i"), `#${toSlug}`);
}

export const QuickInput = forwardRef<QuickInputHandle, Props>(function QuickInput(
  { onTaskCreated, createInInbox = false },
  ref
) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");
  const [creatingLineIndex, setCreatingLineIndex] = useState<number | null>(null);
  const [lineLimitWarning, setLineLimitWarning] = useState(false);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
  }));

  const { data: projects = [] } = useQuery(trpc.projects.list.queryOptions());

  const projectRefs = useMemo(
    () => projects.map((p) => ({ slug: p.slug, name: p.name })),
    [projects]
  );

  const parsedLines = useMemo(
    () => parseQuickInputLines(value, { projects: projectRefs }),
    [value, projectRefs]
  );

  const invalidateToday = () => {
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.projects.list.queryKey() });
  };

  const createTaskMutation = useMutation(
    trpc.tasks.create.mutationOptions({
      onSuccess: invalidateToday,
    })
  );

  const createProjectMutation = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: invalidateToday,
    })
  );

  const resolveProjectId = (line: ParsedLine): string | null => {
    if (!line.parse.projectSlug) return null;
    return projects.find((p) => p.slug === line.parse.projectSlug)?.id ?? null;
  };

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
  };

  const submitValidLines = async (lines: ParsedLine[]) => {
    const valid = lines.filter((line) => isLineProjectValid(line.parse));
    if (valid.length === 0) return { created: 0, remaining: lines.map((l) => l.raw) };

    for (const line of valid) {
      await createTaskForLine(line);
    }

    const invalid = lines.filter((line) => !isLineProjectValid(line.parse));
    return {
      created: valid.length,
      remaining: invalid.map((l) => l.raw),
    };
  };

  const handleBulkSubmit = async () => {
    if (!value.trim() || createTaskMutation.isPending) return;

    if (parsedLines.length > MAX_COMPOSER_LINES) {
      setLineLimitWarning(true);
      return;
    }
    setLineLimitWarning(false);

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

  const handleCreateProjectForLine = async (line: ParsedLine) => {
    const warning = line.parse.warnings.find((w) => w.code === "project_not_found");
    if (!warning) return;

    setCreatingLineIndex(line.lineIndex);
    try {
      const slug = warning.slug;
      const name = slug.replace(/-/g, " ");
      const created = await createProjectMutation.mutateAsync({ name, slug });

      const fixedRaw = replaceProjectSlugInLine(line.raw, warning.slug, created.slug);
      const parse = parseQuickInput(fixedRaw, {
        projects: [...projectRefs, { slug: created.slug, name: created.name }],
      });

      if (!isLineProjectValid(parse)) {
        setValue((v) => replaceComposerLineAtIndex(v, line.lineIndex, fixedRaw));
        return;
      }

      await createTaskMutation.mutateAsync({
        title: parse.title,
        scheduledDate:
          parse.bucketOverride === "later"
            ? null
            : (parse.scheduledDate ?? (createInInbox ? null : undefined)),
        bucketOverride: parse.bucketOverride,
        projectId: created.id,
        priority: parse.priority,
      });

      setValue((v) => removeComposerLineAtIndex(v, line.lineIndex));
      onTaskCreated?.({
        bucket: deriveBucket(
          { scheduledDate: parse.scheduledDate, bucketOverride: parse.bucketOverride },
          new Date()
        ),
        scheduledDate: parse.scheduledDate,
      });
    } finally {
      setCreatingLineIndex(null);
    }
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
      <textarea
        id="kash-quick-input"
        data-quick-input
        ref={textareaRef}
        rows={2}
        className="glass-input glass-textarea w-full resize-y"
        placeholder="add tasks — one per line. Use `;` for properties. ⌘↵ to add."
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (
            lineLimitWarning &&
            parseQuickInputLines(e.target.value, { projects: projectRefs }).length <=
              MAX_COMPOSER_LINES
          ) {
            setLineLimitWarning(false);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void handleBulkSubmit();
          }
        }}
        autoComplete="off"
        spellCheck={false}
        disabled={createTaskMutation.isPending}
      />
      <p className="mt-1.5 text-xs text-kash-ink-muted">
        Enter for new line · ⌘↵ to add tasks
        {createTaskMutation.isPending ? " · Adding…" : null}
      </p>

      {lineLimitWarning ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          Too many lines — add at most {MAX_COMPOSER_LINES} tasks at once.
        </p>
      ) : null}

      {value.trim() ? (
        parsedLines.length === 1 && singleLineParse ? (
          <ParsePreviewChips parse={singleLineParse} />
        ) : parsedLines.length > 1 ? (
          <MultiLineParsePreview lines={parsedLines} />
        ) : null
      ) : null}

      <ComposerLineErrors
        lines={parsedLines}
        creatingLineIndex={creatingLineIndex}
        onApplySuggestion={handleApplySuggestion}
        onCreateProject={(line) => void handleCreateProjectForLine(line)}
      />
    </section>
  );
});

"use client";

import type { SearchResult } from "@/trpc/routers/search";

const KIND_LABEL: Record<SearchResult["kind"], string> = {
  task: "Task",
  backlog: "Backlog",
  project: "Project",
  client: "Client",
};

/**
 * One search result, shared by the capture panel and the ⌘K palette (W17f) so a
 * task looks the same wherever you find it.
 *
 * `selected` is styling only — the keyboard loop lives in the parent, because
 * each surface has its own idea of what else is in the list.
 */
export function SearchResultRow({
  result,
  selected,
  onSelect,
  showKind = true,
}: {
  result: SearchResult;
  selected: boolean;
  onSelect: () => void;
  showKind?: boolean;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onSelect}
      className={`flex w-full items-baseline gap-2 px-3 py-1.5 text-left text-sm ${
        selected ? "bg-active-surface" : ""
      }`}
    >
      {showKind ? (
        <span className="shrink-0 rounded-chip bg-surface-2 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ink-faint">
          {KIND_LABEL[result.kind]}
        </span>
      ) : null}
      <span className={`min-w-0 flex-1 truncate ${result.done ? "text-ink-muted" : "text-ink"}`}>
        {result.title}
        {result.snippet ? (
          <span className="ml-2 text-xs text-ink-faint">{result.snippet}</span>
        ) : null}
      </span>
      {result.context ? (
        <span className="shrink-0 text-xs text-ink-faint">{result.context}</span>
      ) : null}
    </button>
  );
}

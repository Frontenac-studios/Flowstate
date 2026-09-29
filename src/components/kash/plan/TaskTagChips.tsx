"use client";

import { useTagStyles } from "@/hooks/useTagStyles";
import { colouredTags, resolveTagStyle } from "@/lib/tasks/tag-styles";

import { TagChip } from "./TagChip";

type Props = {
  tags: string[];
  /** When set, only the first N tags render before a "+N" overflow chip. */
  maxVisible?: number;
  className?: string;
};

/**
 * Tag chips on a task row. Spec v3 "Ta": only COLOURED tags show on rows (gray tags
 * live in the task detail), each with its dot.
 */
export function TaskTagChips({ tags, maxVisible = 3, className = "" }: Props) {
  const styles = useTagStyles();
  const shown = colouredTags(tags, styles);
  if (!shown.length) return null;

  const visible = shown.slice(0, maxVisible);
  const overflow = shown.length - visible.length;

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {visible.map((tag) => (
        <TagChip key={tag} name={tag} color={resolveTagStyle(tag, styles).color} />
      ))}
      {overflow > 0 ? (
        <span className="text-caption font-semibold text-ink-muted">+{overflow}</span>
      ) : null}
    </div>
  );
}

"use client";

import { type ReactNode } from "react";

import { categoryLabel, PROJECT_CATEGORY_META } from "@/lib/projects/categories";
import { type ResolvedCategory } from "@/lib/tasks/resolveTaskCategory";

type Props = {
  /** The previewed category for the current single line, or null when not applicable. */
  preview: ResolvedCategory | null;
  children: ReactNode;
};

// 1.4b: the composer category indicator — a color accent bar down the left edge of
// the input (no chips), with the category name as a faint label below. An unresolved
// preview (1.4d) shows a neutral marker, never the word Adulting.
export function ComposerCategoryAccent({ preview, children }: Props) {
  const resolved = preview && !preview.unresolved ? preview.category : null;
  const color = resolved ? PROJECT_CATEGORY_META[resolved].color : null;

  return (
    <div
      style={{
        borderLeft: `3px solid ${color ?? "var(--border)"}`,
        borderRadius: 0,
        paddingLeft: 10,
      }}
    >
      {children}
      {preview ? (
        <p className="mt-1 flex items-center justify-end gap-1.5 text-xs text-ink-muted">
          {resolved ? (
            <>
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: color ?? undefined }}
                aria-hidden
              />
              {categoryLabel(resolved)}
            </>
          ) : (
            <span className="italic">no category yet</span>
          )}
        </p>
      ) : null}
    </div>
  );
}

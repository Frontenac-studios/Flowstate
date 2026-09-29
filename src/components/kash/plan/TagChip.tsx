import type { ReactNode } from "react";

import { tagColorVars, type TagColor } from "@/lib/tasks/tag-styles";

type Props = {
  name: string;
  color: TagColor | null;
  /** Trailing content, e.g. a remove ×. */
  children?: ReactNode;
  className?: string;
};

/**
 * Spec v3 "Ta" tag chip: a 24px pill, 12/600. Gray by default; a coloured tag uses
 * its muted fill + ink and always carries a 6px dot.
 */
export function TagChip({ name, color, children, className = "" }: Props) {
  const vars = tagColorVars(color);
  return (
    <span
      className={`inline-flex h-6 max-w-[12rem] items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 text-caption font-semibold ${className}`}
      style={{ backgroundColor: vars.fill, color: vars.ink }}
      title={name}
    >
      {color ? (
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-pill"
          style={{ backgroundColor: vars.dot }}
        />
      ) : null}
      <span className="truncate">{name}</span>
      {children}
    </span>
  );
}

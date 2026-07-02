import type { ReactNode } from "react";

import { GhostCategoryStrip } from "@/components/kash/ui/GhostCategoryStrip";

type Props = {
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
};

/** D12 — category-colored marks + invitation copy (no dead "nothing here" ends). */
export function ColoredEmptyInvitation({ title, hint, action, className = "" }: Props) {
  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-card border border-subtle bg-surface px-6 py-10 text-center ${className}`}
    >
      <GhostCategoryStrip className="w-32" opacity={0.55} />
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint ? <p className="max-w-sm text-xs text-ink-muted">{hint}</p> : null}
      {action}
    </div>
  );
}

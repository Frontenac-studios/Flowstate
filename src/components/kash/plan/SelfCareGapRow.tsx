"use client";

import { X } from "lucide-react";
import { useCallback, useState } from "react";

import IconButton from "@/components/kash/ui/IconButton";
import { kashIconProps } from "@/components/kash/ui/icon";
import { categorySolidVar } from "@/lib/projects/category-tokens";

type Props = {
  top: number;
  onStartWalk: () => void;
  onStartBreathe: () => void;
  onDismiss: () => void;
};

/** Interactive dashed gap row — Walk / Breathe offers + dismiss (SC-1). */
export function SelfCareGapRow({ top, onStartWalk, onStartBreathe, onDismiss }: Props) {
  const [hidden, setHidden] = useState(false);

  const dismiss = useCallback(() => {
    setHidden(true);
    onDismiss();
  }, [onDismiss]);

  if (hidden) return null;

  return (
    <div
      className="bg-surface/95 absolute left-11 right-1 z-sticky flex flex-wrap items-center gap-1.5 rounded-md border border-dashed border-[var(--border)] px-2 py-1 shadow-sm"
      style={{ top }}
    >
      <span className="text-caption" style={{ color: categorySolidVar("body_mind") }} aria-hidden>
        ◵
      </span>
      <span className="min-w-0 flex-1 truncate text-caption text-ink-muted">Good gap —</span>
      <button
        type="button"
        onClick={onStartWalk}
        className="rounded-chip border border-subtle px-2 py-0.5 text-caption text-ink transition hover:bg-surface-2"
      >
        Walk 15m
      </button>
      <button
        type="button"
        onClick={onStartBreathe}
        className="rounded-chip border border-subtle px-2 py-0.5 text-caption text-ink transition hover:bg-surface-2"
      >
        Breathe 2m
      </button>
      <IconButton type="button" aria-label="Dismiss gap suggestion" onClick={dismiss}>
        <X {...kashIconProps({ tokenSize: "sm" })} aria-hidden />
      </IconButton>
    </div>
  );
}

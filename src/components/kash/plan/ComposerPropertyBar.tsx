"use client";

import type { ComposerAssistState, ComposerProperty } from "@/lib/parser/composer-assist";

const LABELS: Record<ComposerProperty, string> = {
  title: "title",
  due: "due",
  project: "project",
  priority: "priority",
};

type Props = {
  assist: ComposerAssistState;
  visible: boolean;
};

export function ComposerPropertyBar({ assist, visible }: Props) {
  if (!visible) return null;

  return (
    <div
      className="mb-2 flex flex-wrap items-center gap-1.5"
      role="list"
      aria-label="Expected task properties"
    >
      {assist.properties.map((item, index) => {
        const isActive = item.status === "active";
        const isFilled = item.status === "filled";

        return (
          <span key={item.key} className="inline-flex items-center gap-1.5">
            {index > 0 ? (
              <span className="text-kash-ink-muted/40 text-xs" aria-hidden>
                ·
              </span>
            ) : null}
            <span
              role="listitem"
              aria-current={isActive ? "step" : undefined}
              className={[
                "rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
                isActive
                  ? "bg-[var(--kash-accent-soft)] text-kash-accent"
                  : isFilled
                    ? "text-kash-ink-muted"
                    : "text-kash-ink-muted/45",
              ].join(" ")}
            >
              {LABELS[item.key]}
              {isFilled && !isActive ? <span className="sr-only"> (filled)</span> : null}
            </span>
          </span>
        );
      })}
    </div>
  );
}

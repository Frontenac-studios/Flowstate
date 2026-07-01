"use client";

import ComposerDueDateHelp from "@/components/kash/composer/ComposerDueDateHelp";
import type {
  ProjectComposerAssistState,
  ProjectComposerProperty,
} from "@/lib/parser/project-composer-assist";

const LABELS: Record<ProjectComposerProperty, string> = {
  title: "task",
  due: "due",
  priority: "priority",
  parentDir: "parent dir",
};

type Props = {
  assist: ProjectComposerAssistState;
  visible: boolean;
};

export default function ProjectPropertyBar({ assist, visible }: Props) {
  if (!visible) return null;

  return (
    <div
      className="mb-1 flex flex-wrap items-center gap-1"
      role="list"
      aria-label="Expected task properties"
    >
      {assist.properties.map((item, index) => {
        const isActive = item.status === "active";
        const isFilled = item.status === "filled";

        return (
          <span key={item.key} className="inline-flex items-center gap-1">
            {index > 0 ? (
              <span className="text-ink-muted/40 text-caption" aria-hidden>
                ·
              </span>
            ) : null}
            {item.key === "due" ? (
              <ComposerDueDateHelp
                label={LABELS[item.key]}
                isActive={isActive}
                pillClassName={[
                  "rounded-full px-1.5 py-0.5 text-caption font-medium transition-colors",
                  isActive
                    ? "bg-[var(--accent-soft)] text-accent"
                    : isFilled
                      ? "text-ink-muted"
                      : "text-ink-muted/45",
                ].join(" ")}
              />
            ) : (
              <span
                role="listitem"
                aria-current={isActive ? "step" : undefined}
                className={[
                  "rounded-full px-1.5 py-0.5 text-caption font-medium transition-colors",
                  isActive
                    ? "bg-[var(--accent-soft)] text-accent"
                    : isFilled
                      ? "text-ink-muted"
                      : "text-ink-muted/45",
                ].join(" ")}
              >
                {LABELS[item.key]}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

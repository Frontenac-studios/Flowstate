"use client";

import type {
  ProjectComposerAssistState,
  ProjectComposerProperty,
} from "@/lib/parser/project-composer-assist";

const LABELS: Record<ProjectComposerProperty, string> = {
  title: "task",
  due: "due",
  priority: "priority",
  project: "project",
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
              <span className="text-kash-ink-muted/40 text-[10px]" aria-hidden>
                ·
              </span>
            ) : null}
            <span
              role="listitem"
              aria-current={isActive ? "step" : undefined}
              className={[
                "rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                isActive
                  ? "bg-[var(--kash-accent-soft)] text-kash-accent"
                  : isFilled
                    ? "text-kash-ink-muted"
                    : "text-kash-ink-muted/45",
              ].join(" ")}
            >
              {LABELS[item.key]}
            </span>
          </span>
        );
      })}
    </div>
  );
}

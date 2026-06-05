import type { ReactNode } from "react";

export type ChatMessageSegment =
  | { type: "text"; value: string }
  | { type: "task"; value: string }
  | { type: "bold"; value: string };

/** Splits assistant/user chat text into plain text, `task` chips, and **bold**. */
export function parseChatMessageSegments(text: string): ChatMessageSegment[] {
  const re = /(\*\*[^*]+\*\*|`[^`\n]+`)/g;
  const segments: ChatMessageSegment[] = [];
  let lastIndex = 0;

  for (const match of Array.from(text.matchAll(re))) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, index) });
    }

    const token = match[0];
    if (token.startsWith("**")) {
      segments.push({ type: "bold", value: token.slice(2, -2) });
    } else {
      segments.push({ type: "task", value: token.slice(1, -1) });
    }
    lastIndex = index + token.length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments;
}

function TaskChip({ title }: { title: string }) {
  return (
    <span className="mx-0.5 inline-flex max-w-full items-center rounded-[var(--kash-radius-chip)] border border-[var(--kash-glass-border)] bg-[var(--kash-accent-soft)] px-1.5 py-0.5 font-medium leading-snug text-kash-accent">
      {title}
    </span>
  );
}

/** Renders chat message text with task chips (`title`) and **bold** emphasis. */
export function renderChatMessage(text: string): ReactNode {
  return parseChatMessageSegments(text).map((segment, i) => {
    switch (segment.type) {
      case "task":
        return <TaskChip key={i} title={segment.value} />;
      case "bold":
        return <strong key={i}>{segment.value}</strong>;
      default:
        return segment.value;
    }
  });
}

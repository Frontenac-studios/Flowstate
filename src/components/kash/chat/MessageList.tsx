"use client";

import { useEffect, useRef } from "react";

type Message = {
  id: string;
  role: string;
  content: { type: string; text: string };
};

type Props = {
  messages: Message[];
  streamingText?: string | null;
};

export function MessageList({ messages, streamingText }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  if (messages.length === 0 && !streamingText) {
    return (
      <p className="px-1 py-4 text-sm text-kash-ink-muted">
        Ask what&apos;s on deck, what to drop, or how to reshuffle today.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1 py-2">
      {messages.map((m) => (
        <div
          key={m.id}
          className={`max-w-[95%] rounded-xl px-3 py-2 text-sm ${
            m.role === "user"
              ? "bg-kash-accent-soft ml-auto text-kash-ink"
              : "glass-pill mr-auto text-kash-ink"
          }`}
        >
          <p className="whitespace-pre-wrap">{m.content.text}</p>
        </div>
      ))}
      {streamingText ? (
        <div className="glass-pill mr-auto max-w-[95%] rounded-xl px-3 py-2 text-sm text-kash-ink">
          <p className="whitespace-pre-wrap">{streamingText}</p>
        </div>
      ) : null}
      <div ref={bottomRef} />
    </div>
  );
}

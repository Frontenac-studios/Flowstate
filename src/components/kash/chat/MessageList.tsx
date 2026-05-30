"use client";

import { useEffect, useRef } from "react";

type Message = {
  id: string;
  role: string;
  content: {
    type: string;
    text: string;
    meta?: { source?: string; kind?: string };
  };
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
      {messages.map((m) => {
        const isNudge = m.role === "assistant" && m.content.meta?.source === "nudge";
        return (
          <div key={m.id} className={`max-w-[95%] ${m.role === "user" ? "ml-auto" : "mr-auto"}`}>
            {isNudge ? (
              <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-kash-ink-muted">
                Nudge
              </span>
            ) : null}
            <div
              className={`rounded-[var(--kash-radius-inner)] px-3 py-2 text-sm ${
                m.role === "user" ? "bg-kash-accent-soft text-kash-ink" : "glass-pill text-kash-ink"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content.text}</p>
            </div>
          </div>
        );
      })}
      {streamingText ? (
        <div className="glass-pill mr-auto max-w-[95%] rounded-[var(--kash-radius-inner)] px-3 py-2 text-sm text-kash-ink">
          <p className="whitespace-pre-wrap">{streamingText}</p>
        </div>
      ) : null}
      <div ref={bottomRef} />
    </div>
  );
}

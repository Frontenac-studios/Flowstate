"use client";

import { useEffect, useRef, useState } from "react";

import Textarea from "@/components/kash/ui/Textarea";
import { renderChatMessage } from "@/lib/markdown/render-chat-message";

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
  canEdit?: boolean;
  onEditUserMessage?: (messageId: string, text: string) => void;
};

function UserMessageRow({
  message,
  canEdit,
  onEdit,
}: {
  message: Message;
  canEdit: boolean;
  onEdit?: (messageId: string, text: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content.text);

  useEffect(() => {
    if (!editing) setDraft(message.content.text);
  }, [message.content.text, editing]);

  if (editing && onEdit) {
    return (
      <div className="ml-auto max-w-[95%]">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          className="w-full resize-none text-sm text-ink"
          autoFocus
        />
        <div className="mt-1.5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setDraft(message.content.text);
              setEditing(false);
            }}
            className="rounded-pill border border-border bg-surface px-2 py-0.5 text-xs text-ink-muted hover:text-ink focus:outline-none focus-visible:shadow-[inset_0_0_0_var(--focus-ring-width)_var(--ink)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!draft.trim()}
            onClick={() => {
              onEdit(message.id, draft.trim());
              setEditing(false);
            }}
            className="rounded-pill border border-border bg-surface px-2 py-0.5 text-xs text-accent focus:outline-none focus-visible:shadow-[inset_0_0_0_var(--focus-ring-width)_var(--ink)]"
          >
            Save & resend
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`group relative ml-auto max-w-[95%] ${canEdit && onEdit ? "pl-7" : ""}`}>
      {canEdit && onEdit ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="absolute -left-7 top-1 rounded p-0.5 text-xs text-ink-muted opacity-0 transition hover:text-ink focus:opacity-100 focus:outline-none focus-visible:shadow-[inset_0_0_0_var(--focus-ring-width)_var(--ink)] group-hover:opacity-100"
          aria-label="Edit message"
          title="Edit & resend"
        >
          ✎
        </button>
      ) : null}
      <div className="rounded-[var(--radius-row)] bg-accent-soft px-3 py-2 text-sm text-ink">
        <p className="whitespace-pre-wrap">{renderChatMessage(message.content.text)}</p>
      </div>
    </div>
  );
}

export function MessageList({
  messages,
  streamingText,
  canEdit = false,
  onEditUserMessage,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  if (messages.length === 0 && !streamingText) {
    return (
      <p className="px-1 py-4 text-sm text-ink-muted">
        Ask what&apos;s on deck, what to drop, or how to reshuffle today.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1 py-2">
      {messages.map((m) => {
        const isNudge = m.role === "assistant" && m.content.meta?.source === "nudge";

        if (m.role === "user") {
          return (
            <UserMessageRow key={m.id} message={m} canEdit={canEdit} onEdit={onEditUserMessage} />
          );
        }

        return (
          <div key={m.id} className="mr-auto max-w-[95%]">
            {isNudge ? (
              <span className="mb-1 block text-caption font-medium uppercase tracking-wide text-ink-muted">
                Nudge
              </span>
            ) : null}
            <div className="rounded-[var(--radius-row)] border border-border bg-surface px-3 py-2 text-sm text-ink">
              <p className="whitespace-pre-wrap">{renderChatMessage(m.content.text)}</p>
            </div>
          </div>
        );
      })}
      {streamingText ? (
        <div className="mr-auto max-w-[95%] rounded-[var(--radius-row)] border border-border bg-surface px-3 py-2 text-sm text-ink">
          <p className="whitespace-pre-wrap">{renderChatMessage(streamingText)}</p>
        </div>
      ) : null}
      <div ref={bottomRef} />
    </div>
  );
}

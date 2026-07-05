"use client";

import { useEffect, useRef, useState } from "react";

import { prefersReducedMotion } from "@/lib/animate/motion-tokens";

import Textarea from "@/components/kash/ui/Textarea";
import type { ProposedAction } from "@/lib/chat/proposed-actions";
import { parseFocusTaskId } from "@/lib/chat/threads";
import { renderChatMessage } from "@/lib/markdown/render-chat-message";

import { ConfirmActionCard } from "./ConfirmActionCard";

type Message = {
  id: string;
  role: string;
  content: {
    type: string;
    text: string;
    meta?: {
      source?: string;
      kind?: string;
      proposal?: ProposedAction;
    };
  };
};

type Props = {
  threadId: string;
  messages: Message[];
  streamingText?: string | null;
  isStreaming?: boolean;
  canEdit?: boolean;
  onEditUserMessage?: (messageId: string, text: string) => void;
  onApplyProposal?: (messageId: string, enabledItemIds: string[]) => void;
  onDismissProposal?: (messageId: string) => void;
  hasMoreOlder?: boolean;
  loadingOlder?: boolean;
  onLoadOlder?: () => void;
  proposalBusy?: boolean;
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
  threadId,
  messages,
  streamingText,
  isStreaming = false,
  canEdit = false,
  onEditUserMessage,
  onApplyProposal,
  onDismissProposal,
  hasMoreOlder = false,
  loadingOlder = false,
  onLoadOlder,
  proposalBusy = false,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(messages.length);
  const prevScrollHeightRef = useRef(0);
  const reducedMotionRef = useRef(true);
  const isFocusThread = parseFocusTaskId(threadId) !== null;

  useEffect(() => {
    reducedMotionRef.current = prefersReducedMotion();
  }, []);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const prepended = messages.length > prevCountRef.current && prevScrollHeightRef.current > 0;
    if (prepended) el.scrollTop += el.scrollHeight - prevScrollHeightRef.current;
    else
      bottomRef.current?.scrollIntoView({ behavior: reducedMotionRef.current ? "auto" : "smooth" });
    prevCountRef.current = messages.length;
    prevScrollHeightRef.current = el.scrollHeight;
  }, [messages, streamingText]);

  if (messages.length === 0 && !streamingText && !isStreaming) {
    return (
      <p className="px-1 py-4 text-sm text-ink-muted">
        Ask what&apos;s on deck, what to drop, or how to reshuffle today.
      </p>
    );
  }

  return (
    <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1 py-2">
      {hasMoreOlder && onLoadOlder ? (
        <button
          type="button"
          disabled={loadingOlder}
          onClick={onLoadOlder}
          className="mx-auto rounded-pill border border-border bg-surface px-3 py-1 text-xs text-ink-muted transition hover:text-ink focus:outline-none focus-visible:shadow-[inset_0_0_0_var(--focus-ring-width)_var(--ink)] disabled:opacity-50"
        >
          {loadingOlder ? "Loading…" : "Load older messages"}
        </button>
      ) : null}
      {messages.map((m) => {
        const isNudge = m.role === "assistant" && m.content.meta?.source === "nudge";
        const proposal = m.content.meta?.proposal;

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
            {!isFocusThread &&
            proposal?.status === "pending" &&
            onApplyProposal &&
            onDismissProposal ? (
              <ConfirmActionCard
                proposal={proposal}
                busy={proposalBusy}
                onConfirm={(enabledItemIds) => onApplyProposal(m.id, enabledItemIds)}
                onDismiss={() => onDismissProposal(m.id)}
              />
            ) : null}
          </div>
        );
      })}
      {streamingText ? (
        <div className="mr-auto max-w-[95%] rounded-[var(--radius-row)] border border-border bg-surface px-3 py-2 text-sm text-ink">
          <p className="whitespace-pre-wrap">{renderChatMessage(streamingText)}</p>
        </div>
      ) : isStreaming ? (
        <div
          className="mr-auto max-w-[95%] rounded-[var(--radius-row)] border border-border bg-surface px-3 py-2 text-sm text-ink-muted"
          role="status"
          aria-label="Claude is thinking"
        >
          <span className="inline-flex gap-1" aria-hidden>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint [animation-delay:300ms]" />
          </span>
        </div>
      ) : null}
      <div ref={bottomRef} />
    </div>
  );
}

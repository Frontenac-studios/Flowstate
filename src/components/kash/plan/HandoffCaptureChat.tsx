"use client";

import { useEffect, useMemo, useRef } from "react";

import { ConfirmActionCard } from "@/components/kash/chat/ConfirmActionCard";
import { ChatComposer } from "@/components/kash/chat/ChatComposer";
import { captureContextPlaceholder, createCaptureContext } from "@/lib/chat/capture-context";
import type { ProposedAction } from "@/lib/chat/proposed-actions";
import { GLOBAL_THREAD_ID } from "@/lib/chat/threads";
import { renderChatMessage } from "@/lib/markdown/render-chat-message";
import { useChatPanel } from "@/hooks/useChatPanel";

type CaptureMessage = {
  id: string;
  role: string;
  content: {
    meta?: {
      proposal?: ProposedAction;
    };
  };
};

type Props = {
  onTasksChanged?: () => void;
};

const HANDOFF_CAPTURE_CONTEXT = createCaptureContext({
  surface: "morning-handoff",
  defaultBucket: "today",
});

function findPendingProposal(messages: CaptureMessage[], fromIndex: number) {
  for (let i = messages.length - 1; i >= fromIndex; i--) {
    const message = messages[i];
    if (message?.role !== "assistant") continue;
    const proposal = message.content.meta?.proposal;
    if (proposal?.status === "pending") {
      return { messageId: message.id, proposal };
    }
  }
  return null;
}

function findAppliedAck(
  messages: CaptureMessage[],
  fromIndex: number,
  placementSummaryByMessageId: Record<string, string>
) {
  for (let i = messages.length - 1; i >= fromIndex; i--) {
    const message = messages[i];
    if (message?.role !== "assistant") continue;
    const proposal = message.content.meta?.proposal;
    if (proposal?.kind === "create_task" && proposal.status === "applied") {
      const ack = placementSummaryByMessageId[message.id];
      if (ack) return ack;
    }
  }
  return null;
}

/** Capture-focused chat for morning triage — composer, stream, and confirm card only. */
export function HandoffCaptureChat({ onTasksChanged }: Props) {
  const sessionFloorRef = useRef<number | null>(null);

  const {
    messages,
    isLoading,
    configured,
    streamingText,
    streamError,
    isStreaming,
    sendMessage,
    stopGeneration,
    retry,
    applyProposal,
    dismissProposal,
    proposalBusy,
    placementSummaryByMessageId,
  } = useChatPanel(GLOBAL_THREAD_ID, {
    forceEnabled: true,
    captureContextOverride: HANDOFF_CAPTURE_CONTEXT,
  });

  useEffect(() => {
    if (sessionFloorRef.current === null && !isLoading) {
      sessionFloorRef.current = messages.length;
    }
  }, [isLoading, messages.length]);

  const sessionFloor = sessionFloorRef.current ?? messages.length;

  const pendingProposal = useMemo(
    () => findPendingProposal(messages, sessionFloor),
    [messages, sessionFloor]
  );
  const appliedAck = useMemo(
    () => findAppliedAck(messages, sessionFloor, placementSummaryByMessageId),
    [messages, sessionFloor, placementSummaryByMessageId]
  );

  const placeholder = captureContextPlaceholder(HANDOFF_CAPTURE_CONTEXT);

  return (
    <div className="space-y-[var(--space-2)] rounded-row border border-subtle bg-surface-2 p-[var(--space-3)]">
      {!configured ? (
        <p className="rounded-control bg-accent-soft px-3 py-2 text-caption text-ink-muted">
          Claude isn&apos;t configured — add <code className="text-ink">ANTHROPIC_API_KEY</code> to
          your environment.
        </p>
      ) : null}

      {streamError ? (
        <p className="flex items-center gap-2 text-caption text-critical" role="alert">
          <span>{streamError}</span>
          {!isStreaming ? (
            <button
              type="button"
              onClick={retry}
              className="shrink-0 font-medium underline underline-offset-2"
            >
              Retry
            </button>
          ) : null}
        </p>
      ) : null}

      {streamingText ? (
        <div className="rounded-row border border-border bg-surface px-3 py-2 text-body text-ink">
          <p className="whitespace-pre-wrap">{renderChatMessage(streamingText)}</p>
        </div>
      ) : isStreaming ? (
        <div
          className="rounded-row border border-border bg-surface px-3 py-2 text-body text-ink-muted"
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

      {pendingProposal ? (
        <ConfirmActionCard
          proposal={pendingProposal.proposal}
          busy={proposalBusy}
          onConfirm={(enabledItemIds, editedItems) => {
            void applyProposal(pendingProposal.messageId, enabledItemIds, editedItems).then(() => {
              onTasksChanged?.();
            });
          }}
          onDismiss={() => void dismissProposal(pendingProposal.messageId)}
        />
      ) : null}

      {appliedAck ? (
        <p className="text-caption text-ink-muted" role="status">
          {renderChatMessage(appliedAck)}
        </p>
      ) : null}

      <ChatComposer
        disabled={!configured}
        isStreaming={isStreaming}
        placeholder={placeholder}
        onSend={(text) => void sendMessage(text)}
        onStop={stopGeneration}
      />
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef } from "react";

import { ConfirmActionCard } from "@/components/kash/chat/ConfirmActionCard";
import { ChatComposer } from "@/components/kash/chat/ChatComposer";
import { captureContextPlaceholder, createCaptureContext } from "@/lib/chat/capture-context";
import type { CreateTaskItemEdit, ProposedAction } from "@/lib/chat/proposed-actions";
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
  /** When false, composer is locked until carryovers / due-today opener is acknowledged. */
  dumpEnabled: boolean;
  dumpLockedHint?: string;
  /**
   * `stage` (morning): Confirm adds to the ritual cart; Begin commits.
   * `apply` (onboarding preview): Confirm writes tasks immediately via chat apply.
   */
  commitMode?: "stage" | "apply";
  onStageTasks: (edits: CreateTaskItemEdit[]) => void;
  onTasksChanged?: () => void;
};

const HANDOFF_CAPTURE_CONTEXT = createCaptureContext({
  surface: "morning-handoff",
  defaultBucket: "today",
});

const STAGE_CHROME = {
  headline: "Stage for today's cart?",
  confirmLabel: "Stage",
} as const;

/** Newest matching assistant proposal at or after `fromIndex`, or null. */
function findLatestProposal(
  messages: CaptureMessage[],
  fromIndex: number,
  matches: (proposal: ProposedAction) => boolean
): { messageId: string; proposal: ProposedAction } | null {
  for (let i = messages.length - 1; i >= fromIndex; i--) {
    const message = messages[i];
    if (message?.role !== "assistant") continue;
    const proposal = message.content.meta?.proposal;
    if (proposal && matches(proposal)) {
      return { messageId: message.id, proposal };
    }
  }
  return null;
}

/** Capture-focused chat for morning triage — composer, stream, and confirm card only. */
export function HandoffCaptureChat({
  dumpEnabled,
  dumpLockedHint,
  commitMode = "stage",
  onStageTasks,
  onTasksChanged,
}: Props) {
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
    () => findLatestProposal(messages, sessionFloor, (proposal) => proposal.status === "pending"),
    [messages, sessionFloor]
  );

  const appliedAck = useMemo(() => {
    if (commitMode !== "apply") return null;
    const applied = findLatestProposal(
      messages,
      sessionFloor,
      (proposal) => proposal.kind === "create_task" && proposal.status === "applied"
    );
    return applied ? (placementSummaryByMessageId[applied.messageId] ?? null) : null;
  }, [commitMode, messages, sessionFloor, placementSummaryByMessageId]);

  const placeholder = dumpEnabled
    ? captureContextPlaceholder(HANDOFF_CAPTURE_CONTEXT)
    : (dumpLockedHint ?? "Acknowledge carryovers above before dumping new tasks…");

  const stageChrome = commitMode === "stage" ? STAGE_CHROME : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-[var(--space-2)] rounded-row border border-subtle bg-surface-2 p-[var(--space-3)]">
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

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
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
            createTaskChrome={stageChrome}
            onConfirm={(enabledItemIds, editedItems) => {
              if (commitMode === "stage") {
                if (editedItems?.length) onStageTasks(editedItems);
                void dismissProposal(pendingProposal.messageId);
                return;
              }
              void applyProposal(pendingProposal.messageId, enabledItemIds, editedItems).then(
                () => {
                  onTasksChanged?.();
                }
              );
            }}
            onDismiss={() => void dismissProposal(pendingProposal.messageId)}
          />
        ) : null}

        {appliedAck ? (
          <p className="text-caption text-ink-muted" role="status">
            {renderChatMessage(appliedAck)}
          </p>
        ) : null}
      </div>

      <ChatComposer
        disabled={!configured || !dumpEnabled}
        isStreaming={isStreaming}
        placeholder={placeholder}
        onSend={(text) => void sendMessage(text)}
        onStop={stopGeneration}
      />
    </div>
  );
}

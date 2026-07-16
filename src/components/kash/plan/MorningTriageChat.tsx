"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";

import { ConfirmActionCard } from "@/components/kash/chat/ConfirmActionCard";
import { ChatComposer } from "@/components/kash/chat/ChatComposer";
import { captureContextPlaceholder, createCaptureContext } from "@/lib/chat/capture-context";
import type { CreateTaskItemEdit, ProposedAction } from "@/lib/chat/proposed-actions";
import { GLOBAL_THREAD_ID } from "@/lib/chat/threads";
import { cn } from "@/lib/cn";
import { renderChatMessage } from "@/lib/markdown/render-chat-message";
import { MORNING_HANDOFF_TIMEZONE } from "@/lib/morning-handoff/greeting";
import { useChatPanel } from "@/hooks/useChatPanel";

type CaptureMessage = {
  id: string;
  role: string;
  content: {
    text?: string;
    meta?: {
      proposal?: ProposedAction;
    };
  };
};

export type MorningTriageScriptedMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  createdAt?: Date;
};

export type MorningTriageChatProps = {
  /** When false, composer placeholder nudges triage first; input stays enabled (soft wizard). */
  dumpEnabled: boolean;
  dumpLockedHint?: string;
  /**
   * `stage` (morning): Confirm adds to the ritual cart; Begin commits.
   * `apply` (onboarding preview): Confirm writes tasks immediately via chat apply.
   */
  commitMode?: "stage" | "apply";
  onStageTasks: (edits: CreateTaskItemEdit[]) => void;
  onTasksChanged?: () => void;
  scriptedMessages?: MorningTriageScriptedMessage[];
  /** Inline triage cards (carryover / project / inbox picks) rendered in the thread. */
  actSlot?: ReactNode;
  skipToDumpLabel?: string;
  onSkipToDump?: () => void;
  composerPlaceholder?: string;
};

const HANDOFF_CAPTURE_CONTEXT = createCaptureContext({
  surface: "morning-handoff",
  defaultBucket: "today",
});

const STAGE_CHROME = {
  headline: "Stage for today's cart?",
  confirmLabel: "Stage",
} as const;

function formatBubbleTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: MORNING_HANDOFF_TIMEZONE,
  });
}

function KashAvatar({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-caption font-semibold text-surface",
        className
      )}
      aria-hidden
    >
      K
    </span>
  );
}

function AssistantBubble({
  text,
  timestamp,
  children,
}: {
  text: string;
  timestamp?: Date;
  children?: ReactNode;
}) {
  return (
    <div className="flex max-w-[95%] gap-2">
      <KashAvatar className="mt-0.5" />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-baseline gap-2 text-caption text-ink-muted">
          <span className="font-medium text-ink">Kash</span>
          {timestamp ? (
            <time dateTime={timestamp.toISOString()}>{formatBubbleTime(timestamp)}</time>
          ) : null}
        </div>
        <div className="rounded-row border border-border bg-surface px-3 py-2 text-body text-ink">
          <p className="whitespace-pre-wrap">{renderChatMessage(text)}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

function UserBubble({ text, timestamp }: { text: string; timestamp?: Date }) {
  return (
    <div className="ml-auto max-w-[95%] space-y-1">
      {timestamp ? (
        <p className="text-right text-caption text-ink-muted">
          <time dateTime={timestamp.toISOString()}>{formatBubbleTime(timestamp)}</time>
        </p>
      ) : null}
      <div className="rounded-row bg-accent-soft px-3 py-2 text-body text-ink">
        <p className="whitespace-pre-wrap">{renderChatMessage(text)}</p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex max-w-[95%] gap-2" role="status" aria-label="Kash is typing">
      <KashAvatar className="mt-0.5" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-caption text-ink-muted">Kash is typing…</p>
        <div className="rounded-row border border-border bg-surface px-3 py-2">
          <span className="inline-flex gap-1" aria-hidden>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint [animation-delay:300ms]" />
          </span>
        </div>
      </div>
    </div>
  );
}

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

/** Full-chrome morning triage chat — scripted acts in-thread, dump capture below. */
export function MorningTriageChat({
  dumpEnabled,
  dumpLockedHint,
  commitMode = "stage",
  onStageTasks,
  onTasksChanged,
  scriptedMessages = [],
  actSlot,
  skipToDumpLabel,
  onSkipToDump,
  composerPlaceholder,
}: MorningTriageChatProps) {
  const sessionFloorRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const sessionMessages = useMemo(
    () => messages.slice(sessionFloor) as CaptureMessage[],
    [messages, sessionFloor]
  );

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [
    scriptedMessages.length,
    actSlot,
    sessionMessages.length,
    streamingText,
    isStreaming,
    appliedAck,
  ]);

  const placeholder = dumpEnabled
    ? (composerPlaceholder ?? captureContextPlaceholder(HANDOFF_CAPTURE_CONTEXT))
    : (dumpLockedHint ?? "Reply to Kash, or finish the steps above…");

  const stageChrome = commitMode === "stage" ? STAGE_CHROME : undefined;
  const threadEmpty =
    scriptedMessages.length === 0 &&
    !actSlot &&
    sessionMessages.length === 0 &&
    !streamingText &&
    !isStreaming &&
    !appliedAck;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[var(--space-2)]">
      <div className="flex min-h-[16rem] flex-1 flex-col overflow-hidden rounded-row border border-subtle bg-surface-2">
        <header className="flex shrink-0 items-center gap-2 border-b border-subtle px-[var(--space-3)] py-[var(--space-2)]">
          <KashAvatar />
          <div className="min-w-0">
            <p className="text-body font-semibold text-ink">Kash</p>
            <p className="text-caption text-ink-muted">Morning triage</p>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-[var(--space-3)] py-[var(--space-2)]">
          {!configured ? (
            <p className="rounded-control bg-accent-soft px-3 py-2 text-caption text-ink-muted">
              Claude isn&apos;t configured — add <code className="text-ink">ANTHROPIC_API_KEY</code>{" "}
              to your environment.
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

          {threadEmpty ? (
            <p className="px-1 py-2 text-caption text-ink-muted">
              Kash will walk you through carryovers, projects, and today&apos;s list.
            </p>
          ) : null}

          {scriptedMessages.map((message) => {
            const text = message.text.trim();
            if (!text) return null;

            if (message.role === "user") {
              return <UserBubble key={message.id} text={text} timestamp={message.createdAt} />;
            }

            return <AssistantBubble key={message.id} text={text} timestamp={message.createdAt} />;
          })}

          {actSlot ? (
            <div className="mr-auto max-w-[95%] pl-9">
              <div className="space-y-2">{actSlot}</div>
            </div>
          ) : null}

          {sessionMessages.map((message) => {
            const text = message.content.text?.trim();
            if (!text) return null;

            if (message.role === "user") {
              return <UserBubble key={message.id} text={text} />;
            }

            return <AssistantBubble key={message.id} text={text} />;
          })}

          {streamingText ? (
            <AssistantBubble text={streamingText} />
          ) : isStreaming ? (
            <TypingIndicator />
          ) : null}

          {appliedAck ? (
            <p className="pl-9 text-caption text-ink-muted" role="status">
              {renderChatMessage(appliedAck)}
            </p>
          ) : null}

          <div ref={messagesEndRef} />
        </div>

        <div className="shrink-0 px-[var(--space-3)] pb-[var(--space-2)]">
          {!dumpEnabled && skipToDumpLabel && onSkipToDump ? (
            <button
              type="button"
              onClick={onSkipToDump}
              className="mb-2 text-caption text-ink-muted transition hover:text-ink"
            >
              {skipToDumpLabel}
            </button>
          ) : null}

          <ChatComposer
            disabled={!configured}
            isStreaming={isStreaming}
            placeholder={placeholder}
            rows={4}
            onSend={(text) => void sendMessage(text)}
            onStop={stopGeneration}
          />
        </div>
      </div>

      {pendingProposal ? (
        <div className="flex max-h-[40%] min-h-0 shrink-0 flex-col overflow-hidden rounded-row border border-subtle bg-surface-2">
          <h3 className="shrink-0 px-[var(--space-3)] pt-[var(--space-2)] text-caption font-medium uppercase tracking-wide text-ink-muted">
            Suggested
          </h3>
          <div className="min-h-0 flex-1 overflow-y-auto px-[var(--space-3)] pb-[var(--space-2)]">
            <ConfirmActionCard
              proposal={pendingProposal.proposal}
              busy={proposalBusy}
              createTaskChrome={stageChrome}
              density="compact"
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
          </div>
        </div>
      ) : null}
    </div>
  );
}

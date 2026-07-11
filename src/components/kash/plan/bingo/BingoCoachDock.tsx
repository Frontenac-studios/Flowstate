"use client";

import { useChatPanel } from "@/hooks/useChatPanel";
import { goalsCoachThreadId } from "@/lib/chat/threads";

import { ChatComposer } from "@/components/kash/chat/ChatComposer";
import { MessageList } from "@/components/kash/chat/MessageList";

type Props = {
  year: number;
};

/**
 * Goals coach — a bespoke chat dock beside the bingo grid. Reuses the chat backend
 * (threads, streaming, confirm cards) via useChatPanel with surfaceOverride="goals", so
 * it runs the Goals register + goal tools and never behaves like the task rail. One
 * persistent thread per card year lets an unfinished session resume later.
 */
export default function BingoCoachDock({ year }: Props) {
  const threadId = goalsCoachThreadId(year);
  const {
    messages,
    isLoading,
    hasMoreOlder,
    loadingOlder,
    loadOlderMessages,
    configured,
    streamingText,
    streamError,
    isStreaming,
    sendMessage,
    editAndResend,
    stopGeneration,
    retry,
    applyProposal,
    dismissProposal,
    proposalBusy,
    placementSummaryByMessageId,
  } = useChatPanel(threadId, { forceEnabled: true, surfaceOverride: "goals" });

  const isEmpty = messages.length === 0 && !streamingText && !isStreaming;

  return (
    <section
      className="lg:top-shell flex min-h-[22rem] w-full flex-col rounded-card border border-subtle bg-surface shadow-surface lg:sticky lg:max-h-[calc(100vh-7rem)] lg:w-80 lg:shrink-0"
      aria-label="Goals coach"
    >
      <header className="border-b border-subtle px-4 py-3">
        <h2 className="text-body font-semibold text-ink">Goals coach</h2>
        <p className="text-caption text-ink-muted">Shape your year, one goal at a time.</p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col px-3 pb-1 pt-2">
        {streamError ? (
          <p className="mb-2 flex items-center gap-2 text-caption text-critical" role="alert">
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

        {isLoading ? (
          <p className="px-1 py-4 text-caption text-ink-muted">Loading…</p>
        ) : isEmpty ? (
          <div className="flex flex-1 flex-col justify-center gap-2 px-1 py-4">
            <p className="text-body text-ink">Not sure what to put on your card?</p>
            <p className="text-caption text-ink-muted">
              Tell me a bit about the year you want — what you&apos;d be proud of, what you keep
              meaning to do — and I&apos;ll help you shape a few goals.
            </p>
          </div>
        ) : (
          <MessageList
            threadId={threadId}
            messages={messages}
            streamingText={streamingText}
            isStreaming={isStreaming}
            hasMoreOlder={hasMoreOlder}
            loadingOlder={loadingOlder}
            onLoadOlder={() => void loadOlderMessages()}
            canEdit={!isStreaming}
            onEditUserMessage={(id, text) => void editAndResend(id, text)}
            onApplyProposal={(messageId, enabledItemIds, editedItems, goalEdits) =>
              void applyProposal(messageId, enabledItemIds, editedItems, goalEdits)
            }
            onDismissProposal={(messageId) => void dismissProposal(messageId)}
            proposalBusy={proposalBusy}
            placementSummaryByMessageId={placementSummaryByMessageId}
          />
        )}
      </div>

      <div className="border-t border-subtle px-3 py-2">
        <ChatComposer
          disabled={!configured}
          isStreaming={isStreaming}
          placeholder="Tell the coach about your year…"
          onSend={(text) => void sendMessage(text)}
          onStop={stopGeneration}
        />
      </div>
    </section>
  );
}

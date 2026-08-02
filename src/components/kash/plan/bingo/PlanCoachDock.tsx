"use client";

import { useChatPanel } from "@/hooks/useChatPanel";
import type { PlanningChatSurface } from "@/lib/chat/planning-surface";
import type { ProjectCategory } from "@/lib/projects/categories";

import { ChatComposer } from "@/components/kash/chat/ChatComposer";
import { MessageList } from "@/components/kash/chat/MessageList";

import BingoBalanceChart from "./BingoBalanceChart";

type Props = {
  /** Persistent thread this dock reads/writes. */
  threadId: string;
  /** Chat surface (register + tools) this dock forces, independent of the rail. */
  surface: PlanningChatSurface;
  title: string;
  subtitle: string;
  placeholder: string;
  /** Copy for the pre-conversation empty state. */
  emptyTitle: string;
  emptyBody: string;
  /** When set, the category-balance indicator renders pinned under the composer. */
  balance?: Record<ProjectCategory, number>;
  /**
   * How the dock claims vertical space at `lg`. "sticky" (default) pins the dock to
   * the shell's sticky top as the page scrolls beneath it — for natural-flow pages.
   * "fill" makes the dock fill its flex row's height — for viewport-height pages
   * (Today, Week) that own their internal scroll instead of scrolling the shell.
   */
  heightMode?: "sticky" | "fill";
};

const DOCK_BASE_CLASS =
  "flex min-h-[22rem] w-full flex-col rounded-card border border-subtle bg-surface shadow-surface lg:w-80 lg:shrink-0";
const DOCK_HEIGHT_CLASS: Record<"sticky" | "fill", string> = {
  sticky:
    "lg:top-shell lg:sticky lg:h-[calc(100dvh_-_var(--shell-sticky-top)_-_var(--shell-pad-y))]",
  fill: "lg:h-full",
};

/**
 * A bespoke chat dock beside a planning surface. Reuses the chat backend (threads,
 * streaming, confirm cards) via useChatPanel with a forced surface, so it runs that
 * surface's register + tools and never behaves like the task rail. A single persistent
 * thread lets an unfinished session resume later.
 */
export default function PlanCoachDock({
  threadId,
  surface,
  title,
  subtitle,
  placeholder,
  emptyTitle,
  emptyBody,
  balance,
  heightMode = "sticky",
}: Props) {
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
  } = useChatPanel(threadId, { forceEnabled: true, surfaceOverride: surface });

  const isEmpty = messages.length === 0 && !streamingText && !isStreaming;

  return (
    <section className={`${DOCK_BASE_CLASS} ${DOCK_HEIGHT_CLASS[heightMode]}`} aria-label={title}>
      <header className="border-b border-subtle px-4 py-3">
        <h2 className="text-body font-semibold text-ink">{title}</h2>
        <p className="text-caption text-ink-muted">{subtitle}</p>
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
            <p className="text-body text-ink">{emptyTitle}</p>
            <p className="text-caption text-ink-muted">{emptyBody}</p>
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
          placeholder={placeholder}
          textSizeClassName="!text-[13px]"
          onSend={(text) => void sendMessage(text)}
          onStop={stopGeneration}
        />
        {balance ? (
          <div className="pt-2">
            <BingoBalanceChart balance={balance} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

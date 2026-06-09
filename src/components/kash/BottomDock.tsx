"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useChatPanel } from "@/hooks/useChatPanel";
import { useChatSuggestions } from "@/hooks/useChatSuggestions";
import { isEditableTarget } from "@/lib/keyboard/is-editable-target";
import { GLOBAL_THREAD_ID } from "@/lib/chat/threads";
import { useTRPC } from "@/trpc/client";

import { useChat } from "./chat/ChatProvider";
import { ChatComposer } from "./chat/ChatComposer";
import { ChatSuggestedActions } from "./chat/ChatSuggestedActions";
import { MessageList } from "./chat/MessageList";
import { InboxPanel } from "./inbox/InboxPanel";

/**
 * Bottom dual-mode drawer. Chat visibility is owned by ChatProvider (`railOpen`,
 * toggled by ⌃J), Inbox visibility is local (toggled by ⌃I). The two are mutually
 * exclusive — opening one collapses the other.
 */
export function BottomDock() {
  const { railOpen, activeThreadId, openRail, closeRail, markRead, unreadThreads } = useChat();
  const [inboxOpen, setInboxOpen] = useInboxOpen(closeRail);

  const trpc = useTRPC();
  const { data: triage = [] } = useQuery(trpc.tasks.listTriageCandidates.queryOptions());
  const inboxCount = triage.length;

  // Chat takes precedence: opening chat collapses the inbox.
  useEffect(() => {
    if (railOpen) setInboxOpen(false);
  }, [railOpen, setInboxOpen]);

  const threadId = activeThreadId || GLOBAL_THREAD_ID;
  const showSuggestions = threadId === GLOBAL_THREAD_ID;
  const { messages, isLoading, configured, streamingText, streamError, isStreaming, sendMessage } =
    useChatPanel(threadId);
  const { suggestions, runSuggestion, isSuggestionRunning } = useChatSuggestions(
    threadId,
    showSuggestions,
    sendMessage
  );

  useEffect(() => {
    if (railOpen) markRead(threadId);
  }, [railOpen, markRead, threadId]);

  const mode: "chat" | "inbox" | null = railOpen ? "chat" : inboxOpen ? "inbox" : null;
  const hasUnread = unreadThreads.has(threadId) || unreadThreads.has(GLOBAL_THREAD_ID);

  const openChat = () => {
    setInboxOpen(false);
    openRail();
  };
  const openInbox = () => {
    closeRail();
    setInboxOpen(true);
  };
  const collapse = () => {
    closeRail();
    setInboxOpen(false);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 sm:px-6 lg:px-10">
      <div className="pointer-events-auto w-full max-w-[110rem]">
        <div className="glass-panel-strong mx-auto overflow-hidden rounded-b-none">
          {mode === null ? (
            <div className="flex items-center gap-2 px-4 py-2">
              <button
                type="button"
                onClick={openChat}
                className="relative flex items-center gap-1.5 rounded-[var(--kash-radius-chip)] px-2 py-1 text-sm text-kash-ink-muted transition hover:text-kash-ink"
                title="Chat (⌃J)"
              >
                💬 Chat
                {hasUnread ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-kash-accent" aria-hidden />
                ) : null}
              </button>
              <button
                type="button"
                onClick={openInbox}
                className="flex items-center gap-1.5 rounded-[var(--kash-radius-chip)] px-2 py-1 text-sm text-kash-ink-muted transition hover:text-kash-ink"
                title="Inbox (⌃I)"
              >
                📥 Inbox
                {inboxCount > 0 ? (
                  <span className="rounded-full bg-[var(--kash-accent-soft)] px-1.5 text-xs text-kash-accent">
                    {inboxCount}
                  </span>
                ) : null}
              </button>
              <span className="ml-auto hidden text-xs text-kash-ink-muted sm:block">
                ⌃J chat · ⌃I inbox
              </span>
            </div>
          ) : (
            <div className="flex max-h-[42vh] flex-col">
              <div className="flex items-center gap-1 border-b border-[var(--kash-glass-border)] px-3 py-2">
                <DockTab label="💬 Chat" active={mode === "chat"} onClick={openChat} />
                <DockTab
                  label={inboxCount > 0 ? `📥 Inbox ${inboxCount}` : "📥 Inbox"}
                  active={mode === "inbox"}
                  onClick={openInbox}
                />
                <button
                  type="button"
                  onClick={collapse}
                  className="glass-icon-btn ml-auto text-kash-ink-muted"
                  aria-label="Collapse drawer"
                  title="Collapse"
                >
                  ⌄
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                {mode === "chat" ? (
                  <>
                    {!configured ? (
                      <p className="mb-3 rounded-lg bg-[var(--kash-accent-soft)] px-3 py-2 text-xs text-kash-ink-muted">
                        Claude isn&apos;t configured — add{" "}
                        <code className="text-kash-ink">ANTHROPIC_API_KEY</code> to your
                        environment.
                      </p>
                    ) : null}
                    {streamError ? (
                      <p className="mb-2 text-xs text-red-600" role="alert">
                        {streamError}
                      </p>
                    ) : null}
                    {isLoading ? (
                      <p className="text-sm text-kash-ink-muted">Loading…</p>
                    ) : (
                      <MessageList messages={messages} streamingText={streamingText} />
                    )}
                  </>
                ) : (
                  <InboxPanel active={mode === "inbox"} />
                )}
              </div>

              {mode === "chat" ? (
                <div className="px-3 pb-3">
                  <ChatComposer
                    disabled={!configured}
                    isStreaming={isStreaming}
                    onSend={(text) => void sendMessage(text)}
                    suggestions={
                      showSuggestions ? (
                        <ChatSuggestedActions
                          suggestions={suggestions}
                          disabled={isStreaming || isSuggestionRunning}
                          onSelect={(id) => void runSuggestion(id)}
                        />
                      ) : null
                    }
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DockTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-[var(--kash-radius-chip)] px-2.5 py-1 text-sm transition ${
        active
          ? "bg-[var(--kash-accent-soft)] text-kash-accent"
          : "text-kash-ink-muted hover:text-kash-ink"
      }`}
    >
      {label}
    </button>
  );
}

/** Local inbox-open state plus a ⌃I toggle that collapses chat when opening. */
function useInboxOpen(closeRail: () => void) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.metaKey || e.key.toLowerCase() !== "i") return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      setOpen((prev) => {
        const next = !prev;
        if (next) closeRail();
        return next;
      });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeRail]);

  return [open, setOpen] as const;
}

"use client";

import { useEffect } from "react";

import IconButton from "@/components/kash/ui/IconButton";
import { useChatPanel } from "@/hooks/useChatPanel";
import { useChatSuggestions } from "@/hooks/useChatSuggestions";
import { GLOBAL_THREAD_ID } from "@/lib/chat/threads";

import { useChat } from "./ChatProvider";
import { ChatComposer } from "./ChatComposer";
import { ChatSuggestedActions } from "./ChatSuggestedActions";
import { MessageList } from "./MessageList";

export function ChatRail() {
  const { railOpen, activeThreadId, closeRail, markRead } = useChat();
  const threadId = activeThreadId || GLOBAL_THREAD_ID;
  const showSuggestions = threadId === GLOBAL_THREAD_ID;

  const {
    messages,
    isLoading,
    configured,
    streamingText,
    streamError,
    isStreaming,
    sendMessage,
    editAndResend,
    stopGeneration,
  } = useChatPanel(threadId);
  const { suggestions, runSuggestion, isSuggestionRunning } = useChatSuggestions(
    threadId,
    railOpen && showSuggestions,
    sendMessage
  );

  useEffect(() => {
    if (railOpen) markRead(threadId);
  }, [railOpen, markRead, threadId]);

  // On narrow viewports the rail is an overlay drawer; Escape closes it (but not
  // while typing in the composer). At lg it is an inline column and stays put.
  useEffect(() => {
    if (!railOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.isContentEditable)
      ) {
        return;
      }
      closeRail();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [railOpen, closeRail]);

  if (!railOpen) return null;

  const title = threadId === GLOBAL_THREAD_ID ? "Claude" : "Focus chat";

  return (
    <>
      <div
        className="fixed inset-0 z-overlay bg-black/30 lg:hidden"
        aria-hidden
        onClick={closeRail}
      />
      <aside
        className="fixed inset-y-3 right-3 z-modal flex w-[min(100%-1.5rem,22rem)] flex-col rounded-card border border-border bg-surface p-4 shadow-overlay lg:sticky lg:inset-auto lg:top-6 lg:z-auto lg:h-[calc(100vh-3rem)] lg:w-[min(100%,22rem)] lg:shrink-0"
        aria-label="Claude chat"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <IconButton type="button" onClick={closeRail} aria-label="Close chat">
            ✕
          </IconButton>
        </div>

        {!configured ? (
          <p className="mb-3 rounded-control bg-accent-soft px-3 py-2 text-xs text-ink-muted">
            Claude isn&apos;t configured — add <code className="text-ink">ANTHROPIC_API_KEY</code>{" "}
            to your environment.
          </p>
        ) : null}

        {streamError ? (
          <p className="mb-2 text-xs text-critical" role="alert">
            {streamError}
          </p>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : (
          <MessageList
            messages={messages}
            streamingText={streamingText}
            canEdit={!isStreaming && !isSuggestionRunning}
            onEditUserMessage={(id, text) => void editAndResend(id, text)}
          />
        )}

        <ChatComposer
          disabled={!configured}
          isStreaming={isStreaming}
          onSend={(text) => void sendMessage(text)}
          onStop={stopGeneration}
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
      </aside>
    </>
  );
}

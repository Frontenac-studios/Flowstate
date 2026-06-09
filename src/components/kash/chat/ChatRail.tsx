"use client";

import { useEffect } from "react";

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

  if (!railOpen) return null;

  const title = threadId === GLOBAL_THREAD_ID ? "Claude" : "Focus chat";

  return (
    <aside
      className="glass-panel-strong flex h-[calc(100vh-3rem)] w-[min(100%,22rem)] shrink-0 flex-col p-4"
      aria-label="Claude chat"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-kash-ink">{title}</h2>
        <button
          type="button"
          onClick={closeRail}
          className="glass-icon-btn text-kash-ink-muted"
          aria-label="Close chat"
        >
          ✕
        </button>
      </div>

      {!configured ? (
        <p className="bg-kash-accent-soft mb-3 rounded-lg px-3 py-2 text-xs text-kash-ink-muted">
          Claude isn&apos;t configured — add{" "}
          <code className="text-kash-ink">ANTHROPIC_API_KEY</code> to your environment.
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
    </aside>
  );
}

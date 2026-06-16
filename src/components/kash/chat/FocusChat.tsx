"use client";

import { focusThreadId } from "@/lib/chat/threads";
import { useChatPanel } from "@/hooks/useChatPanel";

import { ChatComposer } from "./ChatComposer";
import { MessageList } from "./MessageList";

type Props = {
  taskId: string;
};

export function FocusChat({ taskId }: Props) {
  const threadId = focusThreadId(taskId);
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

  return (
    <div className="mt-6 border-t border-[var(--kash-glass-border)] pt-4">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-kash-ink-muted">
        Focus thread
      </h2>

      {!configured ? (
        <p className="mb-2 text-xs text-kash-ink-muted">
          Claude isn&apos;t configured — focus chat is unavailable.
        </p>
      ) : null}

      {streamError ? (
        <p className="mb-2 text-xs text-red-600" role="alert">
          {streamError}
        </p>
      ) : null}

      <div className="max-h-48 overflow-hidden">
        {isLoading ? (
          <p className="text-xs text-kash-ink-muted">Loading…</p>
        ) : (
          <MessageList
            messages={messages}
            streamingText={streamingText}
            canEdit={!isStreaming}
            onEditUserMessage={(id, text) => void editAndResend(id, text)}
          />
        )}
      </div>

      <ChatComposer
        disabled={!configured}
        isStreaming={isStreaming}
        placeholder="Ask about this task…"
        onSend={(text) => void sendMessage(text)}
        onStop={stopGeneration}
      />
    </div>
  );
}

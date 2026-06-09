"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { useChat } from "@/components/kash/chat/ChatProvider";
import { GLOBAL_THREAD_ID } from "@/lib/chat/threads";
import { useTRPC } from "@/trpc/client";

export type SendMessageSource = "composer" | "chip";

export function useChatPanel(threadId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { railOpen, activeThreadId, notifyUnread, markRead } = useChat();

  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const { data: configuredData } = useQuery(trpc.chat.isConfigured.queryOptions());
  const { data: messages = [], isLoading } = useQuery(trpc.chat.list.queryOptions({ threadId }));

  const appendUserMutation = useMutation(trpc.chat.appendUser.mutationOptions());
  const recordPhraseSendMutation = useMutation(trpc.chat.recordPhraseSend.mutationOptions());

  const sendMessage = useCallback(
    async (text: string, source: SendMessageSource = "composer") => {
      setStreamError(null);
      setIsStreaming(true);
      setStreamingText("");

      try {
        const { id: userMessageId } = await appendUserMutation.mutateAsync({ threadId, text });

        if (threadId === GLOBAL_THREAD_ID && source === "composer") {
          void recordPhraseSendMutation
            .mutateAsync({ text })
            .then((result) => {
              if (result.promoted) {
                void queryClient.invalidateQueries({
                  queryKey: trpc.chat.listCustomSuggestions.queryKey(),
                });
              }
            })
            .catch(() => {
              // Phrase tracking is best-effort; don't block chat.
            });
        }

        void queryClient.invalidateQueries({
          queryKey: trpc.chat.list.queryKey({ threadId }),
        });

        const res = await fetch("/api/claude/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threadId, userMessageId, text }),
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Couldn't reach Claude — try again.");
        }

        if (!res.body) throw new Error("No response stream.");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assistantText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            if (!part.startsWith("data: ")) continue;
            const payload = JSON.parse(part.slice(6)) as {
              type: string;
              text?: string;
              message?: string;
            };
            if (payload.type === "delta" && payload.text) {
              assistantText += payload.text;
              setStreamingText(assistantText);
            }
            if (payload.type === "error" && payload.message) {
              setStreamError(payload.message);
            }
          }
        }

        setStreamingText(null);
        await queryClient.invalidateQueries({
          queryKey: trpc.chat.list.queryKey({ threadId }),
        });

        const shouldNotify = assistantText.length > 0 && (!railOpen || activeThreadId !== threadId);
        if (shouldNotify) {
          notifyUnread(threadId);
        } else if (railOpen && activeThreadId === threadId) {
          markRead(threadId);
        }
      } catch (err) {
        setStreamError(err instanceof Error ? err.message : "Couldn't reach Claude — try again.");
        setStreamingText(null);
      } finally {
        setIsStreaming(false);
      }
    },
    [
      activeThreadId,
      appendUserMutation,
      markRead,
      notifyUnread,
      queryClient,
      railOpen,
      recordPhraseSendMutation,
      threadId,
      trpc.chat.list,
      trpc.chat.listCustomSuggestions,
    ]
  );

  return {
    messages,
    isLoading,
    configured: configuredData?.configured ?? false,
    streamingText,
    streamError,
    isStreaming,
    sendMessage,
    setStreamError,
  };
}

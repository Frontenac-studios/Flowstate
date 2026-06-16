"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";

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
  const abortRef = useRef<AbortController | null>(null);

  const { data: configuredData } = useQuery(trpc.chat.isConfigured.queryOptions());
  const { data: messages = [], isLoading } = useQuery(trpc.chat.list.queryOptions({ threadId }));

  const appendUserMutation = useMutation(trpc.chat.appendUser.mutationOptions());
  const editUserMessageMutation = useMutation(trpc.chat.editUserMessage.mutationOptions());
  const recordPhraseSendMutation = useMutation(trpc.chat.recordPhraseSend.mutationOptions());

  const invalidateTaskQueries = useCallback(() => {
    void queryClient.invalidateQueries({
      predicate: (query) => {
        const root = query.queryKey[0];
        return Array.isArray(root) && root[0] === "tasks";
      },
    });
  }, [queryClient]);

  const refreshMessages = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: trpc.chat.list.queryKey({ threadId }),
    });
  }, [queryClient, threadId, trpc.chat.list]);

  const runStream = useCallback(
    async (userMessageId: string, text: string) => {
      const controller = new AbortController();
      abortRef.current = controller;

      let assistantText = "";

      try {
        const res = await fetch("/api/claude/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threadId, userMessageId, text }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Couldn't reach Claude — try again.");
        }

        if (!res.body) throw new Error("No response stream.");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

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
              mutatedTasks?: boolean;
            };
            if (payload.type === "delta" && payload.text) {
              assistantText += payload.text;
              setStreamingText(assistantText);
            }
            if (payload.type === "done" && payload.mutatedTasks) {
              invalidateTaskQueries();
            }
            if (payload.type === "error" && payload.message) {
              setStreamError(payload.message);
            }
          }
        }

        const shouldNotify = assistantText.length > 0 && (!railOpen || activeThreadId !== threadId);
        if (shouldNotify) {
          notifyUnread(threadId);
        } else if (railOpen && activeThreadId === threadId) {
          markRead(threadId);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        setStreamError(err instanceof Error ? err.message : "Couldn't reach Claude — try again.");
      } finally {
        abortRef.current = null;
        setStreamingText(null);
        setIsStreaming(false);
        await refreshMessages();
      }
    },
    [
      activeThreadId,
      invalidateTaskQueries,
      markRead,
      notifyUnread,
      railOpen,
      refreshMessages,
      threadId,
    ]
  );

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

        await refreshMessages();
        await runStream(userMessageId, text);
      } catch (err) {
        setStreamError(err instanceof Error ? err.message : "Couldn't reach Claude — try again.");
        setStreamingText(null);
        setIsStreaming(false);
      }
    },
    [
      appendUserMutation,
      queryClient,
      recordPhraseSendMutation,
      refreshMessages,
      runStream,
      threadId,
      trpc.chat.listCustomSuggestions,
    ]
  );

  const editAndResend = useCallback(
    async (messageId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      setStreamError(null);
      setIsStreaming(true);
      setStreamingText("");

      try {
        await editUserMessageMutation.mutateAsync({
          threadId,
          messageId,
          text: trimmed,
        });
        await refreshMessages();
        await runStream(messageId, trimmed);
      } catch (err) {
        setStreamError(err instanceof Error ? err.message : "Couldn't update message.");
        setStreamingText(null);
        setIsStreaming(false);
      }
    },
    [editUserMessageMutation, refreshMessages, runStream, threadId]
  );

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    messages,
    isLoading,
    configured: configuredData?.configured ?? false,
    streamingText,
    streamError,
    isStreaming,
    sendMessage,
    editAndResend,
    stopGeneration,
    setStreamError,
  };
}

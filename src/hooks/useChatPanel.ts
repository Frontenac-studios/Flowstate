"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useChat } from "@/components/kash/chat/ChatProvider";
import type { ConfirmUndoFrame } from "@/lib/chat/confirm-undo";
import type { ProposedAction } from "@/lib/chat/proposed-actions";
import { GLOBAL_THREAD_ID } from "@/lib/chat/threads";
import { useSessionUndo } from "@/hooks/useSessionUndo";
import { useTRPC } from "@/trpc/client";

export type SendMessageSource = "composer" | "chip";

type ChatMessage = {
  id: string;
  role: string;
  content: {
    type: string;
    text: string;
    meta?: {
      source?: string;
      kind?: string;
      proposal?: ProposedAction;
    };
  };
  taskId: string | null;
  createdAt: Date;
};

export function useChatPanel(threadId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { pushConfirmUndo } = useSessionUndo();
  const { railOpen, activeThreadId, planningSurface, notifyUnread, markRead } = useChat();

  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [olderMessages, setOlderMessages] = useState<ChatMessage[]>([]);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  // Set when the user hits Stop before the stream's AbortController exists, so the
  // send path can bail instead of streaming a response the user already cancelled.
  const canceledRef = useRef(false);
  const lastUserTextRef = useRef<string | null>(null);

  const { data: configuredData } = useQuery({
    ...trpc.chat.isConfigured.queryOptions(),
    enabled: railOpen,
  });
  const { data: listData, isLoading } = useQuery({
    ...trpc.chat.list.queryOptions({ threadId }),
    enabled: railOpen,
  });

  useEffect(() => {
    setOlderMessages([]);
    setHasMoreOlder(false);
    setLoadingOlder(false);
  }, [threadId]);

  useEffect(() => {
    if (listData) setHasMoreOlder(listData.hasMore);
  }, [listData]);

  const messages = useMemo(
    () => [...olderMessages, ...(listData?.messages ?? [])],
    [olderMessages, listData?.messages]
  );

  const appendUserMutation = useMutation(trpc.chat.appendUser.mutationOptions());
  const editUserMessageMutation = useMutation(trpc.chat.editUserMessage.mutationOptions());
  const recordPhraseSendMutation = useMutation(trpc.chat.recordPhraseSend.mutationOptions());
  const applyProposalMutation = useMutation(trpc.chat.applyProposedAction.mutationOptions());
  const dismissProposalMutation = useMutation(trpc.chat.dismissProposedAction.mutationOptions());

  const invalidateTaskQueries = useCallback(() => {
    void queryClient.invalidateQueries({
      predicate: (query) => {
        const root = query.queryKey[0];
        return Array.isArray(root) && root[0] === "tasks";
      },
    });
  }, [queryClient]);

  const loadOlderMessages = useCallback(async () => {
    const oldest = messages[0];
    if (!oldest || loadingOlder || !hasMoreOlder) return;
    setLoadingOlder(true);
    try {
      const result = await queryClient.fetchQuery(
        trpc.chat.list.queryOptions({ threadId, beforeMessageId: oldest.id })
      );
      setOlderMessages((prev) => [...result.messages, ...prev]);
      setHasMoreOlder(result.hasMore);
    } finally {
      setLoadingOlder(false);
    }
  }, [hasMoreOlder, loadingOlder, messages, queryClient, threadId, trpc.chat.list]);

  const refreshMessages = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: trpc.chat.list.queryKey({ threadId }),
    });
  }, [queryClient, threadId, trpc.chat.list]);

  const runStream = useCallback(
    async (userMessageId: string, text: string) => {
      if (canceledRef.current) {
        setStreamingText(null);
        setIsStreaming(false);
        return;
      }
      const controller = new AbortController();
      abortRef.current = controller;
      // Stop pressed between controller creation and the first await.
      if (canceledRef.current) controller.abort();

      let assistantText = "";

      try {
        const res = await fetch("/api/claude/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            threadId,
            userMessageId,
            text,
            planningSurface: threadId === GLOBAL_THREAD_ID ? planningSurface : null,
          }),
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
              proposal?: ProposedAction | null;
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
      planningSurface,
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
      canceledRef.current = false;
      lastUserTextRef.current = text;

      try {
        const { id: userMessageId } = await appendUserMutation.mutateAsync({ threadId, text });

        if (canceledRef.current) {
          setStreamingText(null);
          setIsStreaming(false);
          return;
        }

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
      canceledRef.current = false;
      lastUserTextRef.current = trimmed;

      try {
        await editUserMessageMutation.mutateAsync({
          threadId,
          messageId,
          text: trimmed,
        });
        if (canceledRef.current) {
          setStreamingText(null);
          setIsStreaming(false);
          return;
        }
        setOlderMessages([]);
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
    canceledRef.current = true;
    abortRef.current?.abort();
    setStreamingText(null);
    setIsStreaming(false);
  }, []);

  const retry = useCallback(() => {
    const text = lastUserTextRef.current;
    if (!text) return;
    void sendMessage(text);
  }, [sendMessage]);

  const applyProposal = useCallback(
    async (messageId: string, enabledItemIds: string[]) => {
      try {
        const result = await applyProposalMutation.mutateAsync({ messageId, enabledItemIds });
        if (result.undoFrames?.length) {
          pushConfirmUndo(result.undoFrames as ConfirmUndoFrame[]);
        }
        invalidateTaskQueries();
        await refreshMessages();
      } catch (err) {
        setStreamError(
          err instanceof Error ? err.message : "Couldn't apply that. Please try again."
        );
      }
    },
    [applyProposalMutation, invalidateTaskQueries, pushConfirmUndo, refreshMessages]
  );

  const dismissProposal = useCallback(
    async (messageId: string) => {
      try {
        await dismissProposalMutation.mutateAsync({ messageId });
        await refreshMessages();
      } catch (err) {
        setStreamError(
          err instanceof Error ? err.message : "Couldn't dismiss that. Please try again."
        );
      }
    },
    [dismissProposalMutation, refreshMessages]
  );

  return {
    messages,
    isLoading,
    hasMoreOlder,
    loadingOlder,
    loadOlderMessages,
    configured: configuredData?.configured ?? false,
    streamingText,
    streamError,
    isStreaming,
    proposalBusy: applyProposalMutation.isPending || dismissProposalMutation.isPending,
    sendMessage,
    editAndResend,
    stopGeneration,
    retry,
    applyProposal,
    dismissProposal,
    setStreamError,
  };
}

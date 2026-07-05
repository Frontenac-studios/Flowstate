"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import {
  CHAT_SUGGESTION_DEFS,
  getChatSuggestionDef,
  type ChatSuggestionDef,
} from "@/lib/chat/chat-suggestion-defs";
import {
  mergeAndSortSuggestions,
  readBuiltinUsageCounts,
  recordSuggestionUsage,
} from "@/lib/chat/chat-suggestions-storage";
import { startOfLocalDay, toISODateString } from "@/lib/dates/local-day";
import { readLastWasLarge, writeLastWasLarge } from "@/lib/rdm/rdm-session-storage";
import { useTRPC } from "@/trpc/client";

function clientTzOffsetMinutes(): number {
  return -new Date().getTimezoneOffset();
}

export type SendMessageFn = (text: string, source?: "composer" | "chip") => Promise<void>;

export function useChatSuggestions(
  threadId: string,
  enabled: boolean,
  sendMessage: SendMessageFn,
  onError?: (message: string) => void
) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [usageTick, setUsageTick] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const { data: customSuggestions = [] } = useQuery({
    ...trpc.chat.listCustomSuggestions.queryOptions(),
    enabled,
  });

  const builtinUsageCounts = useMemo(() => {
    void usageTick;
    return readBuiltinUsageCounts();
  }, [usageTick]);

  const suggestions = useMemo(() => {
    if (!enabled) return [];
    const customUsageCounts = Object.fromEntries(
      customSuggestions.map((def) => [def.id, def.usageCount ?? 0])
    );
    return mergeAndSortSuggestions(
      CHAT_SUGGESTION_DEFS,
      customSuggestions,
      builtinUsageCounts,
      customUsageCounts
    );
  }, [builtinUsageCounts, customSuggestions, enabled]);

  const suggestionById = useMemo(() => {
    const map = new Map<string, ChatSuggestionDef>();
    for (const def of CHAT_SUGGESTION_DEFS) map.set(def.id, def);
    for (const def of customSuggestions) map.set(def.id, def);
    return map;
  }, [customSuggestions]);

  const suggestMutation = useMutation(trpc.chat.suggestWorkOn.mutationOptions());
  const recordUsageMutation = useMutation(trpc.chat.recordCustomSuggestionUsage.mutationOptions());

  const runSuggestion = useCallback(
    async (id: string) => {
      if (!enabled || isRunning) return;

      const def = suggestionById.get(id) ?? getChatSuggestionDef(id);
      if (!def) return;

      setIsRunning(true);

      try {
        if (def.kind === "work_on") {
          recordSuggestionUsage(id);
          setUsageTick((n) => n + 1);

          const localDate = toISODateString(startOfLocalDay());
          const result = await suggestMutation.mutateAsync({
            threadId,
            localDate,
            tzOffsetMinutes: clientTzOffsetMinutes(),
            lastWasLarge: readLastWasLarge(),
          });
          writeLastWasLarge(result.lastWasLarge);
        } else {
          await recordUsageMutation.mutateAsync({ id });
          await queryClient.invalidateQueries({
            queryKey: trpc.chat.listCustomSuggestions.queryKey(),
          });
          await sendMessage(def.userText, "chip");
        }

        await queryClient.invalidateQueries({
          queryKey: trpc.chat.list.queryKey({ threadId }),
        });
      } catch (err) {
        onError?.(
          err instanceof Error ? err.message : "Couldn't run that suggestion. Please try again."
        );
      } finally {
        setIsRunning(false);
      }
    },
    [
      enabled,
      isRunning,
      onError,
      queryClient,
      recordUsageMutation,
      sendMessage,
      suggestMutation,
      suggestionById,
      threadId,
      trpc.chat.list,
      trpc.chat.listCustomSuggestions,
    ]
  );

  return {
    suggestions,
    runSuggestion,
    isSuggestionRunning: isRunning || suggestMutation.isPending || recordUsageMutation.isPending,
  };
}

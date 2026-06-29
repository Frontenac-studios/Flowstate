"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { embedText } from "@/lib/tasks/embed-text";
import { useTRPC } from "@/trpc/client";

const DEBOUNCE_MS = 250;
const MIN_TITLE_LENGTH = 3;

/**
 * Compose-time tag suggestions (§7A): debounce the in-progress title, embed it in the
 * browser, and ask the server for tags from near tagged neighbours. Suggestion only —
 * the caller decides whether to apply. Returns [] until a title is long enough.
 */
export function useAbyssTagSuggest(title: string, exclude: string[]): string[] {
  const trpc = useTRPC();
  const [embedding, setEmbedding] = useState<number[] | null>(null);

  useEffect(() => {
    const trimmed = title.trim();
    if (trimmed.length < MIN_TITLE_LENGTH) {
      setEmbedding(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void embedText(trimmed)
        .then((vector) => {
          if (!cancelled) setEmbedding(vector.length ? vector : null);
        })
        .catch(() => {
          /* best-effort */
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [title]);

  const { data } = useQuery({
    ...trpc.abyss.suggestTags.queryOptions({ embedding: embedding ?? [0], exclude }),
    enabled: embedding !== null,
  });

  return (data ?? []).filter((tag) => !exclude.includes(tag));
}

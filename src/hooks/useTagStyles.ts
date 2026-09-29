"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { type TagStyle, type TagStyleMap } from "@/lib/tasks/tag-styles";
import { useTRPC } from "@/trpc/client";

/** The user's stored tag kinds/colours, keyed by tagKey(name). Empty while loading. */
export function useTagStyles(): TagStyleMap {
  const trpc = useTRPC();
  const { data } = useQuery({
    ...trpc.taskTags.listStyles.queryOptions(),
    staleTime: 60_000,
  });
  return useMemo(
    () =>
      new Map(
        (data ?? []).map((r) => [
          r.nameKey,
          { kind: r.kind as TagStyle["kind"], color: r.color as TagStyle["color"] },
        ])
      ),
    [data]
  );
}

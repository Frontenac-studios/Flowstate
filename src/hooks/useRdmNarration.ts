"use client";

import { useEffect, useState } from "react";

type TaskForNarration = {
  id: string;
  title: string;
  isTop3: boolean;
  priority: number;
  projectSlug: string | null;
};

export function useRdmNarration(task: TaskForNarration | null) {
  const [narration, setNarration] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const taskId = task?.id ?? null;
  const title = task?.title ?? null;
  const isTop3 = task?.isTop3 ?? false;
  const priority = task?.priority ?? 0;
  const projectSlug = task?.projectSlug ?? null;

  useEffect(() => {
    if (!taskId || !title) {
      setNarration(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setNarration(null);

    const fallback = isTop3
      ? `Going with **${title}** — it's Top 3.`
      : `Going with **${title}** — next on your list.`;

    void (async () => {
      try {
        const res = await fetch("/api/claude/narrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            taskId,
            title,
            isTop3,
            priority,
            projectSlug,
            pickReason: "weighted-rdm",
          }),
        });

        if (!res.ok) {
          if (!cancelled) setNarration(fallback);
          return;
        }

        const data = (await res.json()) as { narration?: string };
        if (!cancelled) {
          setNarration(data.narration ?? fallback);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        if (!cancelled) setNarration(fallback);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [taskId, title, isTop3, priority, projectSlug]);

  return { narration, loading };
}

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

  useEffect(() => {
    if (!task) {
      setNarration(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setNarration(null);

    const fallback = task.isTop3
      ? `Going with **${task.title}** — it's Top 3.`
      : `Going with **${task.title}** — next on your list.`;

    void (async () => {
      try {
        const res = await fetch("/api/claude/narrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: task.id,
            title: task.title,
            isTop3: task.isTop3,
            priority: task.priority,
            projectSlug: task.projectSlug,
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
      } catch {
        if (!cancelled) setNarration(fallback);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [task]);

  return { narration, loading };
}

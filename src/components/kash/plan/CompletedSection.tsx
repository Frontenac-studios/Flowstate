"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";

import Checkbox from "@/components/kash/ui/Checkbox";
import { ChevronRight, kashIconProps } from "@/components/kash/ui/icon";
import { useToast } from "@/components/kash/ui/ToastProvider";
import { categoryLabel, type ProjectCategory } from "@/lib/projects/categories";
import { categorySolidVar } from "@/lib/projects/category-tokens";
import { useTRPC } from "@/trpc/client";

const NEUTRAL_CHECK = "var(--ink-faint)";

export type CompletedTaskRow = {
  id: string;
  title: string;
  completedAt: Date;
  category: ProjectCategory;
  categoryUnresolved: boolean;
};

function completedTime(at: Date): string {
  return at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

type Props = {
  completions: CompletedTaskRow[];
  onUncomplete?: (taskId: string) => void;
};

/**
 * AN-T1b: the persistent "Completed · n" tail of the Today list. Completed rows
 * settle here and stay all day; the section clears itself at the local-midnight
 * rollover because its feed is filtered on the local day upstream. Collapsed by
 * default, with a manual toggle — the day's record is there without crowding the
 * live list.
 */
export function CompletedSection({ completions, onUncomplete }: Props) {
  const regionId = useId();
  const [collapsed, setCollapsed] = useState(true);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [uncompletingId, setUncompletingId] = useState<string | null>(null);

  const invalidatePlan = () => {
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listRecentlyCompleted.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listTop3Slots.queryKey() });
  };

  const uncompleteMutation = useMutation(
    trpc.tasks.uncomplete.mutationOptions({
      onSuccess: (row) => {
        onUncomplete?.(row.id);
        invalidatePlan();
        setUncompletingId(null);
      },
      onError: () => {
        setUncompletingId(null);
        toast({ message: "Couldn't uncomplete this task. Please try again.", variant: "error" });
      },
    })
  );

  const handleUncomplete = (taskId: string) => {
    setUncompletingId(taskId);
    uncompleteMutation.mutate({ id: taskId });
  };

  if (completions.length === 0) return null;

  const showBody = !collapsed;

  return (
    <section className="mt-section" aria-labelledby={`${regionId}-heading`}>
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-card px-1 py-1 text-left focus:outline-none focus-visible:shadow-[inset_0_0_0_var(--focus-ring-width)_var(--ink)]"
        aria-expanded={showBody}
        aria-controls={regionId}
        onClick={() => setCollapsed((v) => !v)}
      >
        <ChevronRight
          {...kashIconProps({
            tokenSize: "sm",
            className: `text-ink-faint transition-transform duration-short ease-enter motion-reduce:transition-none ${
              showBody ? "rotate-90" : ""
            }`,
          })}
          aria-hidden
        />
        <span
          id={`${regionId}-heading`}
          className="text-sm font-medium uppercase tracking-wide text-ink-muted"
        >
          Completed
        </span>
        <span className="text-sm text-ink-faint">· {completions.length}</span>
      </button>

      <ul id={regionId} hidden={!showBody} className="mt-3 space-y-2">
        {completions.map((task) => {
          const resolved = task.categoryUnresolved ? null : task.category;
          const checkColor = resolved ? categorySolidVar(resolved) : NEUTRAL_CHECK;
          const label = resolved ? categoryLabel(resolved) : "No category yet";
          const isUncompleting = uncompletingId === task.id;
          return (
            <li
              key={task.id}
              className={`flex min-h-[var(--row-min-height)] items-start gap-2 rounded-card border border-subtle bg-surface px-3 py-[var(--row-py)] ${
                isUncompleting ? "opacity-60" : ""
              }`}
            >
              <Checkbox
                className="mt-0.5"
                accentColor={checkColor}
                aria-label={`Uncomplete ${task.title}`}
                title={label}
                checked
                disabled={uncompleteMutation.isPending}
                onClick={(e) => e.stopPropagation()}
                onChange={() => handleUncomplete(task.id)}
              />
              <span className="min-w-0 flex-1 break-words text-ink-faint line-through">
                {task.title}
              </span>
              <span className="mt-0.5 shrink-0 self-start text-xs text-ink-faint">
                {completedTime(task.completedAt)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

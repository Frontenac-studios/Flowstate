"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import type { AbyssPromotionTarget } from "@/lib/abyss/promotion";
import { categorySolidVar } from "@/lib/projects/category-tokens";
import { categoryLabel, PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";
import { useTRPC } from "@/trpc/client";

import { CalendarIcon, FolderIcon, SunIcon, TargetIcon } from "./icons";

type Props = {
  item: { id: string; category: ProjectCategory | null };
  onClose: () => void;
};

type TargetOption = {
  key: AbyssPromotionTarget;
  label: string;
  hint: string;
  Icon: (props: { size?: number; className?: string }) => React.ReactElement;
  needsCategory: boolean;
};

const TARGETS: TargetOption[] = [
  { key: "today", label: "Today", hint: "a task for today", Icon: SunIcon, needsCategory: false },
  {
    key: "week",
    label: "This week",
    hint: "a task this week",
    Icon: CalendarIcon,
    needsCategory: false,
  },
  {
    key: "project",
    label: "New project",
    hint: "a thread to grow",
    Icon: FolderIcon,
    needsCategory: true,
  },
  {
    key: "goal",
    label: "Annual goal",
    hint: "a goal for the year",
    Icon: TargetIcon,
    needsCategory: true,
  },
];

/**
 * The "Lift it into…" picker (§8B promotion). Today/Week spawn a task; New project /
 * Annual goal spawn their target. Project and goal need a category — if the item has
 * none, the menu reveals category chips before promoting. Owns the mutation; closes on
 * success, outside-click, or Escape.
 */
export default function AbyssPromoteMenu({ item, onClose }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);
  const [pendingTarget, setPendingTarget] = useState<AbyssPromotionTarget | null>(null);

  const promote = useMutation(
    trpc.abyss.promote.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.abyss.list.queryKey() });
        onClose();
      },
    })
  );

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const choose = (target: AbyssPromotionTarget, needsCategory: boolean) => {
    if (needsCategory && !item.category) {
      setPendingTarget(target);
      return;
    }
    promote.mutate({ id: item.id, target });
  };

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Promote into"
      className="absolute right-2 top-9 z-20 w-60 rounded-card border border-abyss-border-strong bg-abyss-surface p-1.5"
    >
      {pendingTarget ? (
        <>
          <p className="px-2 pb-1.5 pt-1 text-caption text-abyss-ink-faint">
            Which corner of life?
          </p>
          <div className="flex flex-wrap gap-1 px-1 pb-1">
            {PROJECT_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                role="menuitem"
                onClick={() => promote.mutate({ id: item.id, target: pendingTarget, category })}
                disabled={promote.isPending}
                className="flex items-center gap-1.5 rounded-pill border border-abyss-border px-2 py-1 text-caption text-abyss-ink transition-colors hover:bg-abyss-surface-2 disabled:opacity-50"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: categorySolidVar(category) }}
                  aria-hidden
                />
                {categoryLabel(category)}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="px-2 pb-1 pt-1 text-caption text-abyss-ink-faint">Lift it into…</p>
          {TARGETS.map(({ key, label, hint, Icon, needsCategory }) => (
            <button
              key={key}
              type="button"
              role="menuitem"
              onClick={() => choose(key, needsCategory)}
              disabled={promote.isPending}
              className="flex w-full items-center gap-2.5 rounded-control px-2 py-1.5 text-left transition-colors hover:bg-abyss-surface-2 disabled:opacity-50"
            >
              <Icon size={17} className="text-abyss-ink-muted" />
              <span className="flex-1 text-body text-abyss-ink">{label}</span>
              <span className="text-caption text-abyss-ink-faint">{hint}</span>
            </button>
          ))}
        </>
      )}
      {promote.isError ? (
        <p className="px-2 py-1 text-caption" style={{ color: "var(--cat-relationships-solid)" }}>
          Couldn&apos;t promote — try again.
        </p>
      ) : null}
    </div>
  );
}

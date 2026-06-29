"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import {
  ageInDays,
  filterItems,
  groupItems,
  isDimming,
  selectKeepsCalling,
  type AbyssAgeFilter,
  type AbyssGroupMode,
  type AbyssGroupableItem,
  type AbyssItemType,
} from "@/lib/abyss/grouping";
import { decodePromotedTarget } from "@/lib/abyss/promotion";
import { categorySolidVar } from "@/lib/projects/category-tokens";
import { useTRPC } from "@/trpc/client";

import AbyssPromoteMenu from "./AbyssPromoteMenu";
import { IdeaIcon, PromoteIcon, SparkleIcon, TaskIcon, TrashIcon } from "./icons";

/** Row shape the List renders — the slice of the abyss_items row it needs. */
export type AbyssListItem = AbyssGroupableItem & { promotedTarget: string | null };

/** Short, warm label for where a promoted item went (shown on its locked chip). */
function promotedLabel(target: string | null): string {
  switch (decodePromotedTarget(target)?.kind) {
    case "today":
      return "in Today";
    case "week":
      return "this week";
    case "project":
      return "a project";
    case "goal":
      return "a goal";
    default:
      return "promoted";
  }
}

type Props = {
  items: AbyssListItem[];
  groupMode: AbyssGroupMode;
  typeFilter: AbyssItemType[];
  ageFilter: AbyssAgeFilter;
  query: string;
  now: Date;
};

function TypeGlyph({ type }: { type: AbyssItemType }) {
  return type === "idea" ? (
    <IdeaIcon size={16} className="text-abyss-ink-muted" />
  ) : (
    <TaskIcon size={16} className="text-abyss-ink-muted" />
  );
}

function Row({ item, now }: { item: AbyssListItem; now: Date }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const deleteMutation = useMutation(
    trpc.abyss.delete.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.abyss.list.queryKey() });
      },
    })
  );

  const dimming = isDimming(now, item);
  const promoted = item.status === "promoted";

  return (
    <div
      className={`group/row relative flex items-start gap-2.5 rounded-r-row py-2 pl-2.5 pr-2 transition-colors hover:bg-abyss-surface ${
        dimming ? "opacity-60" : ""
      }`}
      style={{
        borderLeft: "3px solid",
        borderLeftColor: item.category ? categorySolidVar(item.category) : "var(--abyss-border)",
      }}
    >
      <span className="mt-0.5 shrink-0">
        <TypeGlyph type={item.type} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-body text-abyss-ink">{item.title}</p>
        {item.note ? <p className="mt-0.5 text-meta text-abyss-ink-muted">{item.note}</p> : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {promoted ? (
          <span className="rounded-pill inline-flex items-center gap-1 bg-abyss-surface-2 px-1.5 py-0.5 text-caption text-abyss-ink-muted">
            <PromoteIcon size={12} />
            {promotedLabel(item.promotedTarget)}
          </span>
        ) : item.resurfaceCount > 0 ? (
          <span className="rounded-pill bg-abyss-surface-2 px-1.5 py-0.5 text-caption text-abyss-ink-muted">
            parked {item.resurfaceCount}×
          </span>
        ) : dimming ? (
          <span className="text-caption text-abyss-ink-faint">
            {ageInDays(now, item.lastTouchedAt)}d
          </span>
        ) : null}

        {promoted ? null : (
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={`Promote ${item.title}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className={`rounded-control p-1 text-abyss-ink-faint transition-opacity hover:text-abyss-ink focus:opacity-100 group-hover/row:opacity-100 ${
              menuOpen ? "text-abyss-ink opacity-100" : "opacity-0"
            }`}
          >
            <PromoteIcon size={15} />
          </button>
        )}

        <button
          type="button"
          onClick={() => deleteMutation.mutate({ id: item.id })}
          disabled={deleteMutation.isPending}
          aria-label={`Delete ${item.title}`}
          className="rounded-control p-1 text-abyss-ink-faint opacity-0 transition-opacity hover:text-abyss-ink focus:opacity-100 disabled:opacity-40 group-hover/row:opacity-100"
        >
          <TrashIcon size={15} />
        </button>
      </div>

      {menuOpen ? (
        <AbyssPromoteMenu
          item={{ id: item.id, category: item.category }}
          onClose={() => setMenuOpen(false)}
        />
      ) : null}
    </div>
  );
}

function GroupHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 px-2.5 pb-1 pt-3">
      <span className="text-meta font-medium text-abyss-ink-muted">{label}</span>
      <span className="text-caption text-abyss-ink-faint">· {count}</span>
    </div>
  );
}

export default function AbyssList({ items, groupMode, typeFilter, ageFilter, query, now }: Props) {
  const filtered = useMemo(
    () => filterItems(items, { types: typeFilter, age: ageFilter, query }, now),
    [items, typeFilter, ageFilter, query, now]
  );

  const keepsCalling = useMemo(() => selectKeepsCalling(filtered), [filtered]);
  const groups = useMemo(() => groupItems(filtered, groupMode, now), [filtered, groupMode, now]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1.5 rounded-card border border-abyss-border bg-abyss-surface px-6 py-14 text-center">
        <p className="text-subtitle text-abyss-ink">The deep is empty</p>
        <p className="max-w-sm text-meta text-abyss-ink-muted">
          Park a backburner idea or deferred task above — it&apos;ll wait here, brightening when it
          keeps calling you and dimming as it drifts.
        </p>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <p className="px-2.5 py-8 text-center text-meta text-abyss-ink-muted">Nothing matches.</p>
    );
  }

  return (
    <div className="flex flex-col">
      {keepsCalling.length > 0 ? (
        <section className="bg-abyss-surface/60 mb-1 rounded-card p-1">
          <div className="flex items-center gap-2 px-2.5 pb-1 pt-2">
            <SparkleIcon size={14} className="text-cat-adulting" />
            <span className="text-meta font-medium text-abyss-ink">Keeps calling you</span>
            <span className="text-caption text-abyss-ink-faint">· {keepsCalling.length}</span>
          </div>
          {keepsCalling.map((item) => (
            <Row key={`kc-${item.id}`} item={item} now={now} />
          ))}
        </section>
      ) : null}

      {groups.map((group) => (
        <section key={group.key}>
          <GroupHeader label={group.label} count={group.items.length} />
          {group.items.map((item) => (
            <Row key={item.id} item={item} now={now} />
          ))}
        </section>
      ))}
    </div>
  );
}

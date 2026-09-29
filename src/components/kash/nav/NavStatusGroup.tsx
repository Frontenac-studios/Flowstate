"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { tagColorVars, tagKey } from "@/lib/tasks/tag-styles";
import { useTRPC } from "@/trpc/client";

type Props = {
  expanded: boolean;
  pathname: string;
};

/**
 * Spec v3 "Ta": the status tags (waiting on, blocked, in review, needs info — plus any
 * tag given the Status kind) in the nav with open-task counts. Each opens Today
 * filtered to that tag. Collapsed, the rail shows the coloured dots alone.
 */
export function NavStatusGroup({ expanded, pathname }: Props) {
  const trpc = useTRPC();
  const searchParams = useSearchParams();
  const { data } = useQuery({ ...trpc.taskTags.statusCounts.queryOptions(), staleTime: 30_000 });
  if (!data || data.length === 0) return null;
  const activeTag = pathname === "/today" ? searchParams.get("tag") : null;

  return (
    <div className="flex flex-col">
      <div className="px-1 pb-2 pt-5">
        {expanded ? (
          <span className="whitespace-nowrap px-2 text-micro font-semibold uppercase tracking-caps text-ink-muted">
            Status
          </span>
        ) : (
          <div className="mx-2 h-px bg-menu-divider" />
        )}
      </div>
      <ul className="flex flex-col gap-0.5" aria-label="Status">
        {data.map((status) => {
          const active = activeTag !== null && tagKey(activeTag) === tagKey(status.name);
          return (
            <li key={status.name}>
              <Link
                href={`/today?tag=${encodeURIComponent(status.name)}`}
                title={status.name}
                aria-current={active ? "page" : undefined}
                className={`kash-focus-row flex h-9 items-center rounded-row outline-none transition-colors motion-reduce:transition-none ${
                  expanded ? "gap-2.5 px-3" : "justify-center"
                } ${active ? "bg-active-surface font-semibold text-ink" : "text-ink hover:bg-tint-hover"}`}
              >
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-pill"
                  style={{ backgroundColor: tagColorVars(status.color).dot }}
                />
                {expanded ? (
                  <>
                    <span className="min-w-0 flex-1 truncate text-[14px]">{status.name}</span>
                    <span className="shrink-0 text-caption tabular-nums text-ink-muted">
                      {status.count}
                    </span>
                  </>
                ) : (
                  <span className="sr-only">
                    {status.name}, {status.count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

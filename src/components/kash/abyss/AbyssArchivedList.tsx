"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArchiveRestore, withKashIcon } from "@/components/kash/ui/icon";
import { useTRPC } from "@/trpc/client";
const RestoreIcon = withKashIcon(ArchiveRestore);
const ABYSS_BTN_FOCUS =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-abyss-accent focus-visible:ring-offset-2 focus-visible:ring-offset-abyss-surface";

export default function AbyssArchivedList() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(trpc.abyss.listArchived.queryOptions());
  const restoreMutation = useMutation(
    trpc.abyss.restore.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.abyss.listArchived.queryKey() });
        void queryClient.invalidateQueries({ queryKey: trpc.abyss.list.queryKey() });
      },
    })
  );
  if (isLoading) return <div className="h-10 animate-pulse rounded-row bg-abyss-surface" />;
  if (!data?.length)
    return <p className="text-meta text-abyss-ink-muted">No archived items yet.</p>;
  return (
    <ul className="flex flex-col gap-1.5 rounded-card border border-abyss-border bg-abyss-surface p-2">
      {data.map((row) => (
        <li
          key={row.id}
          className="flex items-start gap-2 rounded-row border border-abyss-border px-3 py-2"
        >
          <span className="min-w-0 flex-1 break-words text-body text-abyss-ink">{row.title}</span>
          <button
            type="button"
            onClick={() => restoreMutation.mutate({ id: row.id })}
            className={`flex shrink-0 items-center gap-1 text-caption text-abyss-ink-muted hover:text-abyss-ink ${ABYSS_BTN_FOCUS}`}
          >
            <RestoreIcon size={12} /> Restore
          </button>
        </li>
      ))}
    </ul>
  );
}

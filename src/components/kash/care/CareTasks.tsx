"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import Button from "@/components/kash/ui/Button";
import { groupByTheme } from "@/lib/care/labels";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/trpc/client";

import CreatePracticeDialog from "./CreatePracticeDialog";
import PracticeRow from "./PracticeRow";
import SuggestedSection from "./SuggestedSection";

type CareActivity = RouterOutputs["care"]["listActivities"][number];

/**
 * The Care "Tasks" tab — the self-care library. Two stacked zones: your practices
 * (theme-grouped, each row a check-off + ⋯ menu) and the suggested catalog. Owns
 * the three reads (listActivities · catalog · recentEvents) and the create/edit
 * dialog; the rows and the suggested section own their own mutations.
 */
export function CareTasks() {
  const trpc = useTRPC();

  const activitiesQuery = useQuery(trpc.care.listActivities.queryOptions());
  const catalogQuery = useQuery(trpc.care.catalog.queryOptions());
  const recentQuery = useQuery(trpc.care.recentEvents.queryOptions());

  // `null` = closed, "new" = create, an activity = edit.
  const [editing, setEditing] = useState<CareActivity | "new" | null>(null);

  const doneToday = useMemo(() => {
    const set = new Set<string>();
    for (const event of recentQuery.data ?? []) {
      if (event.activityId) set.add(event.activityId);
    }
    return set;
  }, [recentQuery.data]);

  const activities = activitiesQuery.data ?? [];
  const groups = groupByTheme(activities);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-subtitle font-medium text-ink">Your practices</h2>
          <Button type="button" variant="ghost" onClick={() => setEditing("new")}>
            + New practice
          </Button>
        </div>

        {activitiesQuery.isLoading ? (
          <p className="px-2 text-meta text-ink-faint">Loading…</p>
        ) : groups.length === 0 ? (
          <p className="rounded-card border border-subtle bg-surface px-4 py-6 text-center text-meta text-ink-faint">
            No practices yet. Adopt a suggestion below, or create your own.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.theme} className="flex flex-col gap-1">
              <h3 className="px-2 text-caption font-medium uppercase tracking-wide text-ink-faint">
                {group.label}
              </h3>
              {group.items.map((activity) => (
                <PracticeRow
                  key={activity.id}
                  activity={activity}
                  doneToday={doneToday.has(activity.id)}
                  onEdit={setEditing}
                />
              ))}
            </div>
          ))
        )}
      </section>

      {!catalogQuery.isLoading ? <SuggestedSection catalog={catalogQuery.data ?? []} /> : null}

      {editing !== null ? (
        <CreatePracticeDialog
          activity={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

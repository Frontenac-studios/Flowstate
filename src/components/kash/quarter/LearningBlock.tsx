"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import Input from "@/components/kash/ui/Input";
import { Check, Plus } from "@/components/kash/ui/icon";
import { formatDuration } from "@/lib/time/duration";
import { useTRPC } from "@/trpc/client";

type Track = {
  projectId: string;
  capability: string;
  why: string | null;
  reachedAt: string | Date | null;
  loggedSeconds: number;
};

/**
 * The learning roadmap on Quarter (W5e, §4). Reads the one active learning
 * project (a business, non-client project flagged `is_learning`) and shows its
 * capability, a qualitative "why", logged time as **context** (no quota), the
 * milestone checklist (project phases), and the terminal "reached" state. Empty
 * until a track is started.
 */
export default function LearningBlock() {
  const trpc = useTRPC();
  const { data: track, isLoading } = useQuery(trpc.learning.get.queryOptions());

  if (isLoading) return null;
  return track ? <ActiveTrack track={track} /> : <StartTrack />;
}

function StartTrack() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [capability, setCapability] = useState("");
  const [why, setWhy] = useState("");

  const create = useMutation(
    trpc.learning.create.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.learning.get.pathFilter());
        setOpen(false);
        setCapability("");
        setWhy("");
      },
    })
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-card border border-dashed border-subtle bg-surface p-4 text-left text-sm text-ink-muted transition hover:text-ink"
      >
        Name a capability to build this quarter — logged as work, measured by milestones, not hours.
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-card border border-subtle bg-surface p-4 shadow-surface">
      <Input
        value={capability}
        onChange={(e) => setCapability(e.target.value)}
        placeholder="The capability — e.g. “Ship production-grade Postgres”"
        aria-label="Capability"
        autoFocus
        className="w-full text-sm"
      />
      <Input
        value={why}
        onChange={(e) => setWhy(e.target.value)}
        placeholder="Why it matters (optional)"
        aria-label="Why"
        className="w-full text-sm"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-control px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:text-ink"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() =>
            capability.trim() &&
            create.mutate({ capability: capability.trim(), why: why.trim() || undefined })
          }
          disabled={create.isPending || !capability.trim()}
          className="rounded-control bg-ink px-3 py-1.5 text-xs font-medium text-surface transition hover:opacity-90 disabled:opacity-50"
        >
          Start track
        </button>
      </div>
    </div>
  );
}

function ActiveTrack({ track }: { track: Track }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const reached = track.reachedAt != null;

  const { data: phases = [] } = useQuery(
    trpc.phases.listByProject.queryOptions({ projectId: track.projectId })
  );

  const invalidatePhases = () =>
    queryClient.invalidateQueries(trpc.phases.listByProject.pathFilter());

  const addMilestone = useMutation(
    trpc.phases.create.mutationOptions({ onSuccess: () => void invalidatePhases() })
  );
  const setComplete = useMutation(
    trpc.phases.setComplete.mutationOptions({ onSuccess: () => void invalidatePhases() })
  );
  const setReached = useMutation(
    trpc.learning.setReached.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries(trpc.learning.get.pathFilter()),
    })
  );

  const [newMilestone, setNewMilestone] = useState("");

  return (
    <div
      className={`rounded-card border bg-surface p-4 shadow-surface ${
        reached ? "border-accent/40" : "border-subtle"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-body font-medium text-ink">{track.capability}</p>
          {track.why ? <p className="mt-0.5 text-caption text-ink-muted">{track.why}</p> : null}
        </div>
        {reached ? (
          <span className="inline-flex shrink-0 items-center gap-1 text-caption font-medium text-accent">
            <Check size={14} /> reached
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-caption text-ink-muted">
        {track.loggedSeconds > 0
          ? `${formatDuration(track.loggedSeconds)} logged this quarter`
          : "No time logged yet"}
      </p>

      <div className="mt-3 flex flex-col gap-1.5">
        {phases.map((p) => (
          <label key={p.id} className="flex cursor-pointer items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={p.completedAt != null}
              onChange={(e) => setComplete.mutate({ id: p.id, completed: e.target.checked })}
              className="h-3.5 w-3.5 rounded border-subtle accent-ink"
            />
            <span className={p.completedAt != null ? "text-ink-muted line-through" : ""}>
              {p.name}
            </span>
          </label>
        ))}

        <div className="mt-1 flex items-center gap-2">
          <Input
            value={newMilestone}
            onChange={(e) => setNewMilestone(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newMilestone.trim()) {
                addMilestone.mutate({ projectId: track.projectId, name: newMilestone.trim() });
                setNewMilestone("");
              }
            }}
            placeholder="Add a milestone…"
            aria-label="Add a milestone"
            className="flex-1 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              if (!newMilestone.trim()) return;
              addMilestone.mutate({ projectId: track.projectId, name: newMilestone.trim() });
              setNewMilestone("");
            }}
            disabled={!newMilestone.trim() || addMilestone.isPending}
            aria-label="Add milestone"
            className="rounded-control border border-subtle p-1.5 text-ink-muted transition hover:text-ink disabled:opacity-50"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={() => setReached.mutate({ projectId: track.projectId, reached: !reached })}
          disabled={setReached.isPending}
          className="text-caption font-medium text-ink-muted transition hover:text-ink disabled:opacity-50"
        >
          {reached ? "Reopen" : "Mark reached"}
        </button>
      </div>
    </div>
  );
}

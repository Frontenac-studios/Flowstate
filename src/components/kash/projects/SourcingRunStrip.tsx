"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "@/components/kash/ui/Button";
import { useOptionalToast } from "@/components/kash/ui/ToastProvider";
import { useTRPC } from "@/trpc/client";

/**
 * The weekly agent's state, above the triage board (W10i).
 *
 * It exists mostly to make autonomous spending visible. The agent researches on a
 * schedule with nobody watching, so the surface it fills has to say plainly what it
 * did, what it cost, and how close it is to the rail that stops it — a background job
 * quietly spending money is exactly the thing a user should never have to go digging
 * for.
 */
function formatCents(cents: number): string {
  return cents < 100 ? `${cents.toFixed(1)}¢` : `$${(cents / 100).toFixed(2)}`;
}

export default function SourcingRunStrip() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const toast = useOptionalToast();

  const { data } = useQuery(trpc.sourcing.runStatus.queryOptions());
  const { data: settings } = useQuery(trpc.sourcing.getSettings.queryOptions());

  const start = useMutation(
    trpc.sourcing.startRun.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.sourcing.runStatus.pathFilter());
        toast?.toast({
          message: "Sourcing queued — the agent picks it up within the hour.",
        });
      },
      onError: (e: { message: string }) => toast?.toast({ message: e.message, variant: "error" }),
    })
  );

  if (!data) return null;

  const run = data.latest;
  const inFlight = run?.status === "discovering" || run?.status === "researching";

  const state = !run
    ? "No runs yet."
    : run.status === "discovering"
      ? "Finding prospects…"
      : run.status === "researching"
        ? `Researching ${run.processed} of ${run.discovered}…`
        : run.status === "failed"
          ? `Last run failed: ${run.error ?? "unknown error"}`
          : `Last run found ${run.discovered} on ${new Date(run.createdAt).toLocaleDateString(
              undefined,
              { month: "short", day: "numeric" }
            )}.`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-subtle bg-surface-2 px-4 py-2">
      <div className="flex min-w-0 flex-col">
        <span className="text-caption text-ink">{state}</span>
        <span className="text-caption text-ink-faint">
          {settings?.weeklyRunEnabled
            ? `Sources every Tuesday · ${settings.weeklyRunBatchSize} a week`
            : "Weekly sourcing is off — turn it on in Settings."}
          {" · "}
          {formatCents(data.spentCents)} of {formatCents(data.ceilingCents)} used this month
        </span>
      </div>
      <Button
        type="button"
        variant="ghost"
        onClick={() => start.mutate()}
        disabled={start.isPending || inFlight || data.atCeiling}
        className="shrink-0 text-sm"
        title={
          data.atCeiling
            ? "The 30-day research ceiling has been reached."
            : "Researches a batch of prospects. About 35¢ each."
        }
      >
        {inFlight ? "Running…" : "Source now"}
      </Button>
    </div>
  );
}

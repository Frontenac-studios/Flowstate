"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import Input from "@/components/kash/ui/Input";
import { useTRPC } from "@/trpc/client";

import type { ProjectDetail } from "./types";

const STATES = [
  { value: "prospect", label: "Prospect" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "done", label: "Done" },
] as const;

const BILLING = [
  { value: "hourly", label: "Hourly" },
  { value: "fixed_fee", label: "Fixed fee" },
] as const;

const CHIP =
  "rounded-chip border px-2.5 py-1 text-caption transition focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)]";

function chipClass(selected: boolean): string {
  return `${CHIP} ${selected ? "border-ink text-ink" : "border-subtle text-ink-muted hover:text-ink"}`;
}

/**
 * Project-level facts, in Plan mode (Kash 3.2, decision 3B).
 *
 * These four had no home worth the name. Renaming cost seven interactions through
 * the setup wizard. `clientId` was never asked for. `state` has existed on the row
 * since W1 with no control anywhere in the app. Billing type was buried in the burn
 * panel below the fold.
 *
 * They live here rather than on the board header because the working surface should
 * stay quiet, and because these are decisions rather than daily actions. Everything
 * autosaves — there is no Save button, so opening this for ten seconds is safe.
 */
export default function ProjectDetailsStrip({ project }: { project: ProjectDetail }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [name, setName] = useState(project.name);
  const [error, setError] = useState<string | null>(null);
  const committedName = useRef(project.name);

  // Follow the server when the project changes underneath us (another surface, a
  // refetch), but never clobber what is being typed right now.
  useEffect(() => {
    if (document.activeElement?.id === "project-name-field") return;
    setName(project.name);
    committedName.current = project.name;
  }, [project.name]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: trpc.projects.list.queryKey() });
    void queryClient.invalidateQueries({
      queryKey: trpc.projects.getById.queryKey({ id: project.id }),
    });
  };

  const updateMutation = useMutation(
    trpc.projects.update.mutationOptions({
      onSuccess: () => {
        setError(null);
        invalidate();
      },
      onError: (err) => {
        console.error("[ProjectDetailsStrip] projects.update failed", err);
        setError("That didn't save. Try again.");
        setName(committedName.current);
      },
    })
  );

  const billingMutation = useMutation(
    trpc.projects.setBillingType.mutationOptions({ onSuccess: invalidate })
  );

  const { data: clients = [] } = useQuery(trpc.clients.list.queryOptions({}));

  const commitName = () => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setName(committedName.current);
      return;
    }
    if (trimmed === committedName.current) return;
    committedName.current = trimmed;
    updateMutation.mutate({ id: project.id, name: trimmed });
  };

  const setClient = (clientId: string | null) => {
    updateMutation.mutate({
      id: project.id,
      clientId,
      // Who the work is for decides the category, the same rule creation uses.
      category: clientId ? "business" : "personal",
    });
  };

  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="project-name-field" className="text-caption text-ink-faint">
            Name
          </label>
          <Input
            id="project-name-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              } else if (e.key === "Escape") {
                setName(committedName.current);
                e.currentTarget.blur();
              }
            }}
            maxLength={120}
            className="w-full"
          />
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-caption text-ink-faint">Client</legend>
          <div className="flex flex-wrap gap-1.5">
            {clients.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => setClient(client.id)}
                aria-pressed={project.clientId === client.id}
                className={chipClass(project.clientId === client.id)}
              >
                {client.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setClient(null)}
              aria-pressed={project.clientId === null}
              className={chipClass(project.clientId === null)}
            >
              Just me
            </button>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-caption text-ink-faint">State</legend>
          <div className="flex flex-wrap gap-1.5">
            {STATES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => updateMutation.mutate({ id: project.id, state: value })}
                aria-pressed={project.state === value}
                className={chipClass(project.state === value)}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-caption text-ink-faint">Billing</legend>
          <div className="flex flex-wrap gap-1.5">
            {BILLING.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  billingMutation.mutate({ projectId: project.id, billingType: value })
                }
                aria-pressed={project.billingType === value}
                className={chipClass(project.billingType === value)}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <p className="mt-3 text-caption text-ink-faint" role="status">
        {error ?? (updateMutation.isPending || billingMutation.isPending ? "Saving…" : "Saved")}
      </p>
    </div>
  );
}

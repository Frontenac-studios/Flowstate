"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import Button from "@/components/kash/ui/Button";
import Input from "@/components/kash/ui/Input";
import { matchClientFromName } from "@/lib/projects/match-client-from-name";
import { categorySolidVar } from "@/lib/projects/category-tokens";
import { useTRPC } from "@/trpc/client";

type Props = {
  onCreated: (result: { id: string }) => void;
  onCancel: () => void;
};

/** "Just me" — internal or personal work, which has no client. */
const JUST_ME = "__just_me__";

/**
 * Creation is one line (Kash 3.2, decision 1A).
 *
 * The only required field is the name. Everything the old form asked for is either
 * derived or deferred:
 *
 * - **Category** is derived from who the work is for. Picking a client means
 *   business; "Just me" means personal. Asking "business or personal?" was asking
 *   the user to translate a concrete fact into an abstract one, and the answer was
 *   then overwritten anyway when a template was chosen.
 * - **clientId** is captured here for the first time. It has existed on `projects`
 *   since W1 and was never asked for at creation, so client work arrived unlinked.
 * - **"Serves a bet?"** moved to the planning surface, where Targets are in view.
 *   At creation it rendered as two unexplained chips whenever no Target existed.
 * - **Templates** moved out with the 10-project gate.
 *
 * The client selection follows the typed name until the user touches it, so the
 * common path really is: type, Enter.
 */
export default function NewProjectForm({ onCreated, onCancel }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  /** null = follow the name. A string = the user chose, so stop guessing. */
  const [clientChoice, setClientChoice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: clients = [] } = useQuery(trpc.clients.list.queryOptions({}));

  const suggestedClientId = useMemo(
    () => matchClientFromName(name, clients)?.id ?? null,
    [name, clients]
  );

  // What is actually selected right now: the user's choice if they made one,
  // otherwise whatever the name suggests, otherwise nothing.
  const selected = clientChoice ?? suggestedClientId;

  const createMutation = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: (project) => {
        void queryClient.invalidateQueries({ queryKey: trpc.projects.list.queryKey() });
        onCreated({ id: project.id });
      },
      onError: (err) => {
        console.error("[NewProjectForm] projects.create failed", err);
        setError(
          err.data?.code === "CONFLICT"
            ? "A project with that name already exists."
            : "Couldn't create the project. Please try again."
        );
      },
    })
  );

  const trimmedName = name.trim();
  const pending = createMutation.isPending;
  const canSubmit = trimmedName.length > 0 && !pending;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);

    const clientId = selected && selected !== JUST_ME ? selected : null;
    createMutation.mutate({
      name: trimmedName,
      // Work for a client is business; work for yourself is personal. Nothing else
      // sets the category at creation.
      category: clientId ? "business" : "personal",
      clientId,
    });
  };

  const chips: { value: string; label: string; business: boolean }[] = [
    ...clients.map((client) => ({ value: client.id, label: client.name, business: true })),
    { value: JUST_ME, label: "Just me", business: false },
  ];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="new-project-name" className="text-caption text-ink-faint">
          Name
        </label>
        <Input
          id="new-project-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Great White Q4 reporting"
          maxLength={120}
          autoFocus
          className="w-full"
        />
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="sr-only">Who is this for?</legend>
        <div className="flex flex-wrap gap-1.5">
          {chips.map(({ value, label, business }) => {
            const isSelected = selected === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setClientChoice(isSelected ? JUST_ME : value)}
                aria-pressed={isSelected}
                className={`flex items-center gap-1.5 rounded-chip border px-2.5 py-1 text-caption transition focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)] ${
                  isSelected ? "border-ink text-ink" : "border-subtle text-ink-muted hover:text-ink"
                }`}
              >
                {business ? (
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor: categorySolidVar("business"),
                      boxShadow: "0 0 0 1px var(--mark-ring)",
                    }}
                    aria-hidden
                  />
                ) : null}
                {label}
              </button>
            );
          })}
        </div>
        {clientChoice === null && suggestedClientId ? (
          <p className="text-caption text-ink-faint">Matched from the name</p>
        ) : null}
      </fieldset>

      {error ? (
        <p role="alert" className="text-body text-critical">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={!canSubmit}>
          {pending ? "Creating…" : "Create and open"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

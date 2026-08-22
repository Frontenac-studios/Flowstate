"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { QueryErrorNotice } from "@/components/kash/ui/QueryErrorNotice";
import Button from "@/components/kash/ui/Button";
import Input from "@/components/kash/ui/Input";
import { formatCents } from "@/lib/rates/format-cents";
import { useTRPC } from "@/trpc/client";

export default function ClientsIndex() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [includeArchived, setIncludeArchived] = useState(false);
  const [creating, setCreating] = useState(false);

  const {
    data: clients,
    isLoading,
    isError,
    refetch,
  } = useQuery(trpc.clients.list.queryOptions({ includeArchived }));

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: trpc.clients.list.queryKey() });

  const archiveMutation = useMutation(
    trpc.clients.archive.mutationOptions({ onSuccess: () => void invalidate() })
  );
  const unarchiveMutation = useMutation(
    trpc.clients.unarchive.mutationOptions({ onSuccess: () => void invalidate() })
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-2">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-title font-semibold text-ink">Clients</h1>
          <p className="mt-1 text-sm text-ink-muted">Who the work is for, and what they pay.</p>
        </div>
        <Button onClick={() => setCreating((v) => !v)}>{creating ? "Close" : "New client"}</Button>
      </header>

      {creating ? (
        <NewClientForm
          onDone={() => {
            setCreating(false);
            void invalidate();
          }}
          onCancel={() => setCreating(false)}
        />
      ) : null}

      {isError ? (
        <QueryErrorNotice onRetry={() => void refetch()} />
      ) : isLoading ? (
        <p className="text-sm text-ink-muted">Loading clients…</p>
      ) : (clients?.length ?? 0) === 0 ? (
        <div className="rounded-card border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-body text-ink">No clients yet.</p>
          <p className="mt-1 text-sm text-ink-muted">
            Add the first client to start attaching rates and billable time.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {clients!.map((client) => (
            <li
              key={client.id}
              className="flex items-center justify-between gap-4 rounded-card border border-border bg-surface px-4 py-3 shadow-surface"
            >
              <Link href={`/clients/${client.id}`} className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-body font-medium text-ink">{client.name}</span>
                  {client.status === "archived" ? (
                    <span className="rounded-chip border border-subtle px-2 py-0.5 text-caption text-ink-muted">
                      Archived
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-caption text-ink-muted">
                  {client.defaultRateCents != null
                    ? `${formatCents(client.defaultRateCents, client.currency)}/hr`
                    : "No rate set"}
                  {" · "}
                  {client.currency}
                </span>
              </Link>
              {client.status === "archived" ? (
                <Button
                  variant="ghost"
                  onClick={() => unarchiveMutation.mutate({ id: client.id })}
                  disabled={unarchiveMutation.isPending}
                >
                  Restore
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => archiveMutation.mutate({ id: client.id })}
                  disabled={archiveMutation.isPending}
                >
                  Archive
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <label className="flex items-center gap-2 text-sm text-ink-muted">
        <input
          type="checkbox"
          checked={includeArchived}
          onChange={(e) => setIncludeArchived(e.target.checked)}
        />
        Show archived
      </label>
    </div>
  );
}

function NewClientForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const trpc = useTRPC();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation(
    trpc.clients.create.mutationOptions({
      onSuccess: () => onDone(),
      onError: (err) => {
        console.error("[NewClientForm] clients.create failed", err);
        setError("Couldn't create the client. Please try again.");
      },
    })
  );

  const trimmedName = name.trim();
  const canSubmit =
    trimmedName.length > 0 && /^[A-Za-z]{3}$/.test(currency) && !createMutation.isPending;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        setError(null);
        createMutation.mutate({
          name: trimmedName,
          currency: currency.toUpperCase(),
          notes: notes.trim() || undefined,
        });
      }}
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-surface"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="new-client-name" className="text-sm font-medium text-ink">
          Name
        </label>
        <Input
          id="new-client-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Great White"
          maxLength={160}
          className="w-full"
          autoFocus
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="new-client-currency" className="text-sm font-medium text-ink">
          Currency <span className="text-ink-muted">(ISO code)</span>
        </label>
        <Input
          id="new-client-currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
          placeholder="USD"
          className="w-24 uppercase"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="new-client-notes" className="text-sm font-medium text-ink">
          Notes <span className="text-ink-muted">(optional)</span>
        </label>
        <Input
          id="new-client-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything worth remembering"
          maxLength={2000}
          className="w-full"
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={!canSubmit}>
          {createMutation.isPending ? "Creating…" : "Create client"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

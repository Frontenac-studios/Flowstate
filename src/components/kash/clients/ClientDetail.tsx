"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { QueryErrorNotice } from "@/components/kash/ui/QueryErrorNotice";
import Button from "@/components/kash/ui/Button";
import Input from "@/components/kash/ui/Input";
import { ArrowLeft } from "@/components/kash/ui/icon";
import { formatCents } from "@/lib/rates/format-cents";
import { useTRPC } from "@/trpc/client";

export default function ClientDetail({ clientId }: { clientId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery(
    trpc.clients.getById.queryOptions({ id: clientId })
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: trpc.clients.getById.queryKey({ id: clientId }),
    });
    void queryClient.invalidateQueries({ queryKey: trpc.clients.list.queryKey() });
  };

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-3xl py-2">
        <QueryErrorNotice onRetry={() => void refetch()} />
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="mx-auto w-full max-w-3xl py-2">
        <p className="text-sm text-ink-muted">Loading client…</p>
      </div>
    );
  }

  const client = data;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-2">
      <Link
        href="/clients"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={16} /> All clients
      </Link>

      <ClientHeader client={client} onSaved={invalidate} />

      <section className="flex flex-col gap-3">
        <h2 className="text-body font-semibold text-ink">Rates</h2>
        {client.rates.length === 0 ? (
          <p className="text-sm text-ink-muted">
            No rates yet. Set a default rate below; add a project-specific rate to override it for
            one project.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {client.rates.map((rate) => (
              <li
                key={rate.id}
                className="flex items-center justify-between gap-4 rounded-card border border-border bg-surface px-4 py-3 shadow-surface"
              >
                <span className="text-body font-medium text-ink">
                  {formatCents(rate.amountCents, client.currency)}/hr
                </span>
                <span className="text-caption text-ink-muted">
                  {rate.projectId ? "Project-specific" : "Client default"}
                  {" · from "}
                  {new Date(rate.effectiveFrom).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
        <SetRateForm clientId={client.id} currency={client.currency} onSaved={invalidate} />
      </section>
    </div>
  );
}

function ClientHeader({
  client,
  onSaved,
}: {
  client: { id: string; name: string; currency: string; notes: string | null; status: string };
  onSaved: () => void;
}) {
  const trpc = useTRPC();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(client.name);
  const [currency, setCurrency] = useState(client.currency);
  const [notes, setNotes] = useState(client.notes ?? "");

  const updateMutation = useMutation(
    trpc.clients.update.mutationOptions({
      onSuccess: () => {
        setEditing(false);
        onSaved();
      },
    })
  );
  const archiveMutation = useMutation(trpc.clients.archive.mutationOptions({ onSuccess: onSaved }));
  const unarchiveMutation = useMutation(
    trpc.clients.unarchive.mutationOptions({ onSuccess: onSaved })
  );

  if (!editing) {
    return (
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-title font-semibold text-ink">
            {client.name}
            {client.status === "archived" ? (
              <span className="rounded-chip border border-subtle px-2 py-0.5 text-caption text-ink-muted">
                Archived
              </span>
            ) : null}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">Billed in {client.currency}</p>
          {client.notes ? <p className="mt-2 text-sm text-ink">{client.notes}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" onClick={() => setEditing(true)}>
            Edit
          </Button>
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
        </div>
      </header>
    );
  }

  const canSubmit =
    name.trim().length > 0 && /^[A-Za-z]{3}$/.test(currency) && !updateMutation.isPending;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        updateMutation.mutate({
          id: client.id,
          name: name.trim(),
          currency: currency.toUpperCase(),
          notes: notes.trim() || null,
        });
      }}
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-surface"
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full"
        aria-label="Client name"
      />
      <Input
        value={currency}
        onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
        className="w-24 uppercase"
        aria-label="Currency"
      />
      <Input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes"
        className="w-full"
        aria-label="Notes"
      />
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={!canSubmit}>
          {updateMutation.isPending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function SetRateForm({
  clientId,
  currency,
  onSaved,
}: {
  clientId: string;
  currency: string;
  onSaved: () => void;
}) {
  const trpc = useTRPC();
  const [amount, setAmount] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const { data: projects } = useQuery(trpc.projects.list.queryOptions());

  const setRateMutation = useMutation(
    trpc.clients.setRate.mutationOptions({
      onSuccess: () => {
        setAmount("");
        setProjectId("");
        onSaved();
      },
      onError: (err) => {
        console.error("[SetRateForm] clients.setRate failed", err);
        setError("Couldn't save the rate. Please try again.");
      },
    })
  );

  const dollars = Number.parseFloat(amount);
  const canSubmit = Number.isFinite(dollars) && dollars >= 0 && !setRateMutation.isPending;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        setError(null);
        setRateMutation.mutate({
          clientId,
          projectId: projectId || null,
          amountCents: Math.round(dollars * 100),
        });
      }}
      className="flex flex-wrap items-end gap-3 rounded-card border border-dashed border-border bg-surface p-4"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="set-rate-amount" className="text-sm font-medium text-ink">
          Rate ({currency}/hr)
        </label>
        <Input
          id="set-rate-amount"
          type="number"
          min={0}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="150"
          className="w-32"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="set-rate-project" className="text-sm font-medium text-ink">
          Applies to
        </label>
        <select
          id="set-rate-project"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="kash-focus-visible rounded-control border border-border bg-surface px-3 py-2 text-body text-ink outline-none"
        >
          <option value="">All projects (client default)</option>
          {(projects ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={!canSubmit}>
        {setRateMutation.isPending ? "Saving…" : "Set rate"}
      </Button>
      {error ? (
        <p role="alert" className="w-full text-sm text-critical">
          {error}
        </p>
      ) : null}
    </form>
  );
}

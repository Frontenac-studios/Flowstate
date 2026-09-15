"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import Button from "@/components/kash/ui/Button";
import Input from "@/components/kash/ui/Input";
import Select from "@/components/kash/ui/Select";
import { claudeDesktopConfig } from "@/lib/mcp/desktop-config";
import { isDesktopRuntime } from "@/lib/runtime/is-desktop";
import { useTRPC } from "@/trpc/client";

type Created = { name: string; token: string };

const EXPIRY_OPTIONS = [
  { value: "", label: "No expiry" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "1 year" },
] as const;

function formatDay(value: Date | string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      className="shrink-0 text-sm"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? "Copied" : label}
    </Button>
  );
}

/**
 * Settings → Integrations → Claude (W18b). Mint a token per device, copy it once,
 * paste the ready-made Claude Desktop config, revoke any time. The plaintext lives
 * only in this component's state until "Done", and is never fetched again.
 */
export default function ClaudeConnectionSection() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: tokens = [], isLoading } = useQuery(trpc.mcpTokens.list.queryOptions());

  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [created, setCreated] = useState<Created | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: trpc.mcpTokens.list.queryKey() });

  const create = useMutation(
    trpc.mcpTokens.create.mutationOptions({
      onSuccess: (row) => {
        setCreated({ name: row.name, token: row.token });
        setName("");
        setExpiry("");
        setError(null);
        refresh();
      },
      onError: (err) => setError(err.message),
    })
  );

  const revoke = useMutation(
    trpc.mcpTokens.revoke.mutationOptions({
      onSettled: () => {
        setConfirmingId(null);
        refresh();
      },
    })
  );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Name the device this token is for.");
      return;
    }
    const days = expiry ? (Number(expiry) as 30 | 90 | 365) : null;
    create.mutate({ name: name.trim(), expiresInDays: days });
  };

  const endpoint = typeof window === "undefined" ? "/api/mcp" : `${window.location.origin}/api/mcp`;

  return (
    <section className="rounded-[var(--radius-row)] border border-border bg-surface p-4 shadow-surface">
      <h2 className="text-sm font-semibold text-ink">Claude</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Let Claude Desktop read your projects, tasks, clients and budget burn, so you can ask
        &ldquo;what&apos;s Great White at?&rdquo; or &ldquo;what didn&apos;t I finish this
        week?&rdquo; in Claude. Read-only: Claude can&apos;t change anything. Each device gets its
        own token, and revoking one cuts that device off straight away.
      </p>

      {created ? (
        <div className="mt-4 space-y-3 rounded-[var(--radius-chip)] border border-subtle bg-surface-2 p-3">
          <p className="text-sm font-medium text-ink">
            Token for {created.name}. Copy it now: Flowstate won&apos;t show it again.
          </p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-control border border-subtle bg-surface px-3 py-1.5 font-mono text-sm text-ink">
              {created.token}
            </code>
            <CopyButton text={created.token} label="Copy token" />
          </div>

          <div className="space-y-2 text-sm text-ink-muted">
            <p>To connect Claude Desktop:</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>In Claude Desktop, open Settings → Developer → Edit Config.</li>
              <li>
                Add this under <code className="font-mono text-ink">mcpServers</code> (or paste it
                whole if the file is empty), then save.
              </li>
              <li>Quit and reopen Claude Desktop. Ask it what Flowstate projects you have.</li>
            </ol>
            {isDesktopRuntime() ? (
              <p>
                This address is Kash&apos;s own local server, so it answers while Kash is running.
                The token also works with Flowstate on the web.
              </p>
            ) : null}
          </div>
          <div className="flex items-start gap-2">
            <pre className="min-w-0 flex-1 overflow-x-auto rounded-control border border-subtle bg-surface px-3 py-2 font-mono text-xs text-ink">
              {claudeDesktopConfig(endpoint, created.token)}
            </pre>
            <CopyButton text={claudeDesktopConfig(endpoint, created.token)} label="Copy config" />
          </div>
          <div className="flex justify-end">
            <Button type="button" className="text-sm" onClick={() => setCreated(null)}>
              Done
            </Button>
          </div>
        </div>
      ) : null}

      <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={onSubmit}>
        <label className="flex min-w-[14rem] flex-1 flex-col gap-1">
          <span className="text-sm font-medium text-ink">Device</span>
          <Input
            value={name}
            maxLength={80}
            placeholder="Claude Desktop, MacBook"
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink">Expires</span>
          <Select value={expiry} onChange={(event) => setExpiry(event.target.value)}>
            {EXPIRY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit" className="text-sm" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create token"}
        </Button>
      </form>
      {error ? <p className="mt-2 text-sm text-critical">{error}</p> : null}

      {isLoading ? null : tokens.length === 0 ? (
        <p className="mt-4 text-sm text-ink-faint">No tokens yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-subtle rounded-[var(--radius-chip)] border border-subtle">
          {tokens.map((token) => {
            const revokedOn = formatDay(token.revokedAt);
            const expiresOn = formatDay(token.expiresAt);
            const expired =
              !revokedOn && token.expiresAt != null && new Date(token.expiresAt) <= new Date();
            const lastUsed = formatDay(token.lastUsedAt);
            const inactive = revokedOn != null || expired;
            return (
              <li key={token.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2">
                <div className={`min-w-0 flex-1 ${inactive ? "opacity-60" : ""}`}>
                  <p className="truncate text-sm font-medium text-ink">{token.name}</p>
                  <p className="text-sm text-ink-muted">
                    <span className="font-mono">fs_pat_{token.tokenPrefix}…</span>
                    {" · "}
                    {lastUsed ? `last used ${lastUsed}` : "never used"}
                    {" · "}
                    {revokedOn
                      ? `revoked ${revokedOn}`
                      : expired
                        ? `expired ${expiresOn}`
                        : expiresOn
                          ? `expires ${expiresOn}`
                          : "no expiry"}
                  </p>
                </div>
                {inactive ? null : confirmingId === token.id ? (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      className="text-sm"
                      disabled={revoke.isPending}
                      onClick={() => revoke.mutate({ id: token.id })}
                    >
                      Revoke
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-sm"
                      onClick={() => setConfirmingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-sm"
                    onClick={() => setConfirmingId(token.id)}
                  >
                    Revoke…
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

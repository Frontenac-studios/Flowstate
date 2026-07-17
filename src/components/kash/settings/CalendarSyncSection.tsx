"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import Button from "@/components/kash/ui/Button";
import { useTRPC } from "@/trpc/client";

type SyncStatus = "off" | "on" | "error";

type FlashMessage = {
  tone: "success" | "error";
  text: string;
};

function oauthErrorMessage(reason: string | null): string {
  switch (reason) {
    case "unauthorized":
      return "Sign in required to connect Google Calendar.";
    case "not_configured":
      return "Google Calendar is not configured on this deployment.";
    case "missing_code":
      return "Google did not return an authorization code.";
    case "invalid_state":
      return "OAuth session expired. Try connecting again.";
    case "exchange_failed":
      return "Could not complete Google sign-in.";
    case "access_denied":
      return "Google Calendar access was not granted.";
    default:
      return reason?.trim() ? reason : "Connection failed.";
  }
}

function formatLastSynced(at: Date | null | undefined): string | null {
  if (!at) return null;
  return at.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function syncStatusLabel(status: SyncStatus): string {
  switch (status) {
    case "on":
      return "Up to date";
    case "error":
      return "Sync error";
    default:
      return "Not syncing";
  }
}

function syncStatusClass(status: SyncStatus): string {
  if (status === "error") return "border-critical text-critical";
  if (status === "on") return "border-border bg-surface text-ink-muted";
  return "border-subtle text-ink-faint";
}

function CalendarAiToggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-chip)] border border-subtle bg-surface p-3">
      <input
        type="checkbox"
        className="mt-0.5"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="text-sm font-medium text-ink">
          Include calendar details in AI suggestions
        </span>
        <span className="mt-0.5 block text-sm text-ink-muted">
          When off, Kash only uses event counts and busy durations — not titles or locations.
          Private events are always hidden in planning surfaces.
        </span>
      </span>
    </label>
  );
}

/** Google Calendar OAuth connection, calendar picker, and sync controls (Integrations). */
export function CalendarSyncSection() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [flash, setFlash] = useState<FlashMessage | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: connection, isLoading: connectionLoading } = useQuery(
    trpc.calendar.connections.get.queryOptions()
  );
  const { data: syncStatus } = useQuery(trpc.calendar.connections.getSyncStatus.queryOptions());
  const { data: settings, isLoading: settingsLoading } = useQuery(trpc.settings.get.queryOptions());

  const connected = connection?.connected === true;
  const { data: availableCalendars = [], isLoading: calendarsLoading } = useQuery({
    ...trpc.calendar.calendars.listAvailable.queryOptions(),
    enabled: connected,
  });

  useEffect(() => {
    if (connected) {
      setSelectedIds(connection.selectedCalendarIds ?? []);
    }
  }, [connected, connection?.selectedCalendarIds]);

  const invalidateCalendar = () => {
    void queryClient.invalidateQueries({ queryKey: trpc.calendar.connections.get.queryKey() });
    void queryClient.invalidateQueries({
      queryKey: trpc.calendar.connections.getSyncStatus.queryKey(),
    });
    void queryClient.invalidateQueries({
      queryKey: trpc.calendar.calendars.listAvailable.queryKey(),
    });
  };

  useEffect(() => {
    const calendar = searchParams.get("calendar");
    if (!calendar) return;

    if (calendar === "connected") {
      setFlash({
        tone: "success",
        text: "Google Calendar connected. Choose which calendars to sync.",
      });
      void queryClient.invalidateQueries({ queryKey: trpc.calendar.connections.get.queryKey() });
      void queryClient.invalidateQueries({
        queryKey: trpc.calendar.connections.getSyncStatus.queryKey(),
      });
      void queryClient.invalidateQueries({
        queryKey: trpc.calendar.calendars.listAvailable.queryKey(),
      });
    } else if (calendar === "error") {
      setFlash({
        tone: "error",
        text: oauthErrorMessage(searchParams.get("reason")),
      });
    }

    router.replace("/settings?tab=integrations");
  }, [searchParams, router, queryClient, trpc]);

  const selectionMutation = useMutation(
    trpc.calendar.calendars.updateSelection.mutationOptions({
      onSuccess: () => {
        invalidateCalendar();
      },
    })
  );

  const syncMutation = useMutation(
    trpc.calendar.connections.syncNow.mutationOptions({
      onSuccess: () => {
        invalidateCalendar();
      },
    })
  );

  const aiMutation = useMutation(
    trpc.settings.updateCalendarAiEnabled.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.settings.get.queryKey() });
      },
    })
  );

  const savedIds = useMemo(
    () => connection?.selectedCalendarIds ?? [],
    [connection?.selectedCalendarIds]
  );
  const selectionDirty = useMemo(() => {
    if (selectedIds.length !== savedIds.length) return true;
    const saved = new Set(savedIds);
    return selectedIds.some((id) => !saved.has(id));
  }, [savedIds, selectedIds]);

  const busy =
    connectionLoading ||
    settingsLoading ||
    selectionMutation.isPending ||
    syncMutation.isPending ||
    aiMutation.isPending;

  const toggleCalendar = (calendarId: string) => {
    setSelectedIds((current) =>
      current.includes(calendarId)
        ? current.filter((id) => id !== calendarId)
        : [...current, calendarId]
    );
  };

  const saveSelection = async () => {
    if (selectedIds.length === 0) return;
    await selectionMutation.mutateAsync({ calendarIds: selectedIds });
    syncMutation.mutate();
  };

  const handleDisconnect = (event: React.FormEvent<HTMLFormElement>) => {
    if (
      !window.confirm(
        "Disconnect Google Calendar? Synced events will be removed and planning will no longer include calendar busy time."
      )
    ) {
      event.preventDefault();
    }
  };

  const status = syncStatus?.status ?? "off";
  const lastSyncedLabel = formatLastSynced(syncStatus?.lastSyncedAt ?? connection?.lastSyncedAt);

  return (
    <section className="rounded-[var(--radius-row)] border border-subtle bg-surface p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-ink">Google Calendar</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Read-only inbound sync — Kash shows external events on your timeline and respects busy
            time when placing holds. Kash never writes back to Google Calendar.
          </p>
        </div>
        {connected ? (
          <span
            className={`shrink-0 rounded-pill border px-2 py-0.5 text-xs ${syncStatusClass(status)}`}
          >
            {syncStatusLabel(status)}
          </span>
        ) : null}
      </div>

      {flash ? (
        <p
          className={`mt-3 text-sm ${flash.tone === "error" ? "text-critical" : "text-ink"}`}
          role="alert"
        >
          {flash.text}
        </p>
      ) : null}

      {connectionLoading ? (
        <p className="mt-4 text-sm text-ink-muted">Loading…</p>
      ) : !connection?.configured ? (
        <p className="mt-4 text-sm text-ink-muted">
          Google Calendar OAuth is not configured for this deployment. Add{" "}
          <code className="text-ink">GOOGLE_CALENDAR_CLIENT_ID</code>,{" "}
          <code className="text-ink">GOOGLE_CALENDAR_CLIENT_SECRET</code>, and{" "}
          <code className="text-ink">GOOGLE_CALENDAR_REDIRECT_URI</code> to{" "}
          <code className="text-ink">.env.local</code> (see{" "}
          <code className="text-ink">.env.example</code>
          ). For desktop, also register{" "}
          <code className="text-ink">
            http://127.0.0.1:3000/api/calendar/google/callback
          </code> (and <code className="text-ink">:4310</code> for release) as Authorized redirect
          URIs in Google Cloud Console.
        </p>
      ) : !connected ? (
        <div className="mt-4">
          <Button
            type="button"
            className="text-sm"
            data-testid="calendar-connect-button"
            onClick={() => {
              window.location.href = "/api/calendar/google/connect";
            }}
          >
            Connect Google Calendar
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="text-sm text-ink-muted">
            <p>
              Connected as{" "}
              <span className="font-medium text-ink">
                {syncStatus?.accountEmail ?? connection.accountEmail ?? "Google account"}
              </span>
            </p>
            {lastSyncedLabel ? (
              <p className="mt-1 text-xs text-ink-faint">Last synced {lastSyncedLabel}</p>
            ) : (
              <p className="mt-1 text-xs text-ink-faint">Not synced yet</p>
            )}
            {status === "error" && (syncStatus?.lastError ?? connection.lastError) ? (
              <p className="mt-2 text-sm text-critical" role="alert">
                {syncStatus?.lastError ?? connection.lastError}
              </p>
            ) : null}
          </div>

          <div>
            <h3 className="text-sm font-medium text-ink">Calendars to sync</h3>
            <p className="mt-1 text-sm text-ink-muted">
              Select which Google calendars feed into Kash. At least one is required to sync.
            </p>

            {calendarsLoading ? (
              <p className="mt-3 text-sm text-ink-muted">Loading calendars…</p>
            ) : availableCalendars.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">No readable calendars found.</p>
            ) : (
              <fieldset className="mt-3 space-y-2" disabled={busy}>
                <legend className="sr-only">Calendars to sync</legend>
                {availableCalendars.map((calendar) => {
                  const checked = selectedIds.includes(calendar.id);
                  return (
                    <label
                      key={calendar.id}
                      className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-chip)] border border-subtle bg-surface p-3"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCalendar(calendar.id)}
                      />
                      <span
                        aria-hidden
                        className="h-3 w-3 shrink-0 rounded-full border border-subtle"
                        style={{
                          backgroundColor: calendar.backgroundColor ?? "var(--surface-2)",
                        }}
                      />
                      <span className="min-w-0 flex-1 text-sm text-ink">
                        {calendar.name}
                        {calendar.primary ? (
                          <span className="ml-1 text-xs text-ink-faint">(primary)</span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            )}

            {selectedIds.length === 0 ? (
              <p className="mt-2 text-sm text-critical" role="alert">
                Select at least one calendar to sync.
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                className="text-sm"
                disabled={busy || !selectionDirty || selectedIds.length === 0}
                onClick={() => void saveSelection()}
              >
                {selectionMutation.isPending ? "Saving…" : "Save selection"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-sm"
                disabled={busy || savedIds.length === 0}
                onClick={() => syncMutation.mutate()}
              >
                {syncMutation.isPending ? "Syncing…" : "Sync now"}
              </Button>
            </div>

            {selectionMutation.isError ? (
              <p className="mt-2 text-sm text-critical" role="alert">
                Could not save calendar selection. Try again.
              </p>
            ) : null}
            {syncMutation.isError ? (
              <p className="mt-2 text-sm text-critical" role="alert">
                {syncMutation.error.message}
              </p>
            ) : null}
          </div>

          <form
            action="/api/calendar/google/disconnect"
            method="post"
            className="pt-2"
            onSubmit={handleDisconnect}
          >
            <Button type="submit" variant="ghost" className="text-sm text-ink-muted">
              Disconnect Google Calendar
            </Button>
          </form>
        </div>
      )}

      <fieldset className="mt-4 space-y-2 border-t border-subtle pt-4" disabled={busy}>
        <legend className="sr-only">Calendar AI privacy</legend>
        <CalendarAiToggle
          checked={settings?.calendarAiEnabled ?? true}
          disabled={settingsLoading}
          onChange={(next) => aiMutation.mutate(next)}
        />
        {aiMutation.isError ? (
          <p className="text-sm text-critical" role="alert">
            Could not save AI privacy setting. Try again.
          </p>
        ) : null}
      </fieldset>
    </section>
  );
}

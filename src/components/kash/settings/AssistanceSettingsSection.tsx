"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { useTRPC } from "@/trpc/client";

import { NotificationSettingsSection } from "./NotificationSettingsSection";

function OnOffToggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
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
        <span className="text-sm font-medium text-ink">{label}</span>
        <span className="mt-0.5 block text-sm text-ink-muted">{description}</span>
      </span>
    </label>
  );
}

/** Assistance behaviors — feature controls, not per-nudge notification toggles (A3). */
export function AssistanceSettingsSection() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(trpc.settings.get.queryOptions());

  const mutation = useMutation(
    trpc.settings.updateAssistanceSettings.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.settings.get.queryKey() });
      },
    })
  );

  const assistanceEnabled = data?.assistanceEnabled ?? true;
  const middayOn = (data?.top3MiddayCheckin ?? "on") === "on";
  const busy = isLoading || mutation.isPending;

  type AssistancePatch = Parameters<typeof mutation.mutate>[0];

  // Track the latest applied settings so a rapid second toggle patches onto the value
  // we just sent, not a stale render snapshot — otherwise back-to-back clicks clobber.
  const latestRef = useRef<AssistancePatch | null>(null);
  useEffect(() => {
    latestRef.current = {
      assistanceEnabled,
      top3MiddayCheckin: middayOn ? "on" : "off",
    };
  }, [assistanceEnabled, middayOn]);

  const save = (patch: Partial<AssistancePatch>) => {
    const base: AssistancePatch = latestRef.current ?? {
      assistanceEnabled,
      top3MiddayCheckin: middayOn ? "on" : "off",
    };
    const next: AssistancePatch = { ...base, ...patch };
    latestRef.current = next;
    mutation.mutate(next);
  };

  return (
    <section className="rounded-[var(--radius-row)] border border-subtle bg-surface p-4">
      <h2 className="text-sm font-semibold text-ink">Assistance</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Gentle, load-aware help on Today — separate from notification delivery.
      </p>

      <fieldset className="mt-4 space-y-2" disabled={busy}>
        <legend className="sr-only">Assistance preferences</legend>
        <OnOffToggle
          label="Assistance nudges"
          description="Master switch for reassurance and steering helpers."
          checked={assistanceEnabled}
          onChange={(next) => save({ assistanceEnabled: next })}
        />
        <OnOffToggle
          label="Top-3 midday check-in"
          description='On busy days this hides automatically. When on, incomplete Top 3 show a quiet "still time for these" line after noon.'
          checked={middayOn}
          disabled={!assistanceEnabled}
          onChange={(next) => save({ top3MiddayCheckin: next ? "on" : "off" })}
        />
      </fieldset>

      {mutation.isError ? (
        <p className="mt-2 text-sm text-critical" role="alert">
          Could not save assistance settings. Try again.
        </p>
      ) : null}
    </section>
  );
}

export function NotificationsAndAssistanceSection() {
  return (
    <>
      <NotificationSettingsSection />
      <AssistanceSettingsSection />
    </>
  );
}

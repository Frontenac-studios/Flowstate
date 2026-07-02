"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
    trpc.settings.updateTop3MiddayCheckin.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.settings.get.queryKey() });
      },
    })
  );

  const middayOn = (data?.top3MiddayCheckin ?? "on") === "on";
  const busy = isLoading || mutation.isPending;

  return (
    <section className="rounded-[var(--radius-row)] border border-subtle bg-surface p-4">
      <h2 className="text-sm font-semibold text-ink">Assistance</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Gentle, load-aware help on Today — separate from notification delivery.
      </p>

      <fieldset className="mt-4 space-y-2" disabled={busy}>
        <legend className="sr-only">Assistance preferences</legend>
        <OnOffToggle
          label="Top-3 midday check-in"
          description='On busy days this hides automatically. When on, incomplete Top 3 show a quiet "still time for these" line after noon.'
          checked={middayOn}
          onChange={(next) => mutation.mutate(next ? "on" : "off")}
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

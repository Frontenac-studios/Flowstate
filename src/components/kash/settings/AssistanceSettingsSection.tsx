"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";
import Select from "@/components/kash/ui/Select";

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
  const morningHandoffOn = (data?.morningHandoff ?? "on") === "on";
  const goalSteeringOn = (data?.goalSteering ?? "on") === "on";
  const balanceNudgeOn = (data?.balanceNudge ?? "on") === "on";
  const middayOn = (data?.top3MiddayCheckin ?? "on") === "on";
  const evidenceCadence = (data?.evidenceCadence ?? "quarterly") as "monthly" | "quarterly" | "off";
  const busy = isLoading || mutation.isPending;

  const save = (patch: Partial<Parameters<typeof mutation.mutate>[0]>) => {
    mutation.mutate({
      assistanceEnabled,
      morningHandoff: morningHandoffOn ? "on" : "off",
      goalSteering: goalSteeringOn ? "on" : "off",
      balanceNudge: balanceNudgeOn ? "on" : "off",
      top3MiddayCheckin: middayOn ? "on" : "off",
      evidenceCadence,
      ...patch,
    });
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
          label="Morning hand-off"
          description="Show a brief once-per-day opening hand-off on Today."
          checked={morningHandoffOn}
          disabled={!assistanceEnabled}
          onChange={(next) => save({ morningHandoff: next ? "on" : "off" })}
        />
        <OnOffToggle
          label="Goal steering"
          description="Allow small next-step goal suggestions in calm moments."
          checked={goalSteeringOn}
          disabled={!assistanceEnabled}
          onChange={(next) => save({ goalSteering: next ? "on" : "off" })}
        />
        <OnOffToggle
          label="Balance nudge"
          description="Nudge when one life category is being starved."
          checked={balanceNudgeOn}
          disabled={!assistanceEnabled}
          onChange={(next) => save({ balanceNudge: next ? "on" : "off" })}
        />
        <OnOffToggle
          label="Top-3 midday check-in"
          description='On busy days this hides automatically. When on, incomplete Top 3 show a quiet "still time for these" line after noon.'
          checked={middayOn}
          disabled={!assistanceEnabled}
          onChange={(next) => save({ top3MiddayCheckin: next ? "on" : "off" })}
        />
        <label className="flex items-center justify-between gap-3 rounded-[var(--radius-chip)] border border-subtle bg-surface p-3">
          <span>
            <span className="text-sm font-medium text-ink">Evidence cadence</span>
            <span className="mt-0.5 block text-sm text-ink-muted">
              How often wins memory resurfaces.
            </span>
          </span>
          <Select
            value={evidenceCadence}
            disabled={!assistanceEnabled}
            onChange={(e) =>
              save({ evidenceCadence: e.target.value as "monthly" | "quarterly" | "off" })
            }
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="off">Off</option>
          </Select>
        </label>
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

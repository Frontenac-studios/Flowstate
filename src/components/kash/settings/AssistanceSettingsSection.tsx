"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { useTRPC } from "@/trpc/client";
import Select from "@/components/kash/ui/Select";
import { GOAL_COACH_NOTE_MAX } from "@/lib/settings/constants";

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

  type AssistancePatch = Parameters<typeof mutation.mutate>[0];

  // Track the latest applied settings so a rapid second toggle patches onto the value
  // we just sent, not a stale render snapshot — otherwise back-to-back clicks clobber.
  const latestRef = useRef<AssistancePatch | null>(null);
  useEffect(() => {
    latestRef.current = {
      assistanceEnabled,
      morningHandoff: morningHandoffOn ? "on" : "off",
      goalSteering: goalSteeringOn ? "on" : "off",
      balanceNudge: balanceNudgeOn ? "on" : "off",
      top3MiddayCheckin: middayOn ? "on" : "off",
      evidenceCadence,
    };
  }, [
    assistanceEnabled,
    morningHandoffOn,
    goalSteeringOn,
    balanceNudgeOn,
    middayOn,
    evidenceCadence,
  ]);

  const save = (patch: Partial<AssistancePatch>) => {
    const base: AssistancePatch = latestRef.current ?? {
      assistanceEnabled,
      morningHandoff: morningHandoffOn ? "on" : "off",
      goalSteering: goalSteeringOn ? "on" : "off",
      balanceNudge: balanceNudgeOn ? "on" : "off",
      top3MiddayCheckin: middayOn ? "on" : "off",
      evidenceCadence,
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

/** Explicit steer for the goals coach (J2) — shown only when the coach is enabled. */
export function GoalCoachSettingsSection() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data } = useQuery(trpc.settings.get.queryOptions());
  const { data: chatConfig } = useQuery(trpc.chat.isConfigured.queryOptions());

  const mutation = useMutation(
    trpc.settings.updateGoalCoachPrefs.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.settings.get.queryKey() });
      },
    })
  );

  const ambition = (data?.goalCoachAmbition ?? "balanced") as "gentle" | "balanced" | "stretch";
  const serverNote = data?.goalCoachNote ?? "";
  const [note, setNote] = useState(serverNote);
  useEffect(() => {
    setNote(serverNote);
  }, [serverNote]);

  if (!chatConfig?.bingoCoachEnabled) return null;

  const busy = mutation.isPending;
  const commit = (nextAmbition: typeof ambition, nextNote: string) => {
    mutation.mutate({ ambition: nextAmbition, note: nextNote });
  };

  return (
    <section className="rounded-[var(--radius-row)] border border-subtle bg-surface p-4">
      <h2 className="text-sm font-semibold text-ink">Goals coach</h2>
      <p className="mt-1 text-sm text-ink-muted">
        How the coach suggests annual bingo goals when you talk it through.
      </p>

      <fieldset className="mt-4 space-y-2" disabled={busy}>
        <legend className="sr-only">Goals coach preferences</legend>
        <label className="flex items-center justify-between gap-3 rounded-[var(--radius-chip)] border border-subtle bg-surface p-3">
          <span>
            <span className="text-sm font-medium text-ink">Ambition</span>
            <span className="mt-0.5 block text-sm text-ink-muted">
              How bold its suggestions run.
            </span>
          </span>
          <Select
            value={ambition}
            onChange={(e) => commit(e.target.value as typeof ambition, note)}
          >
            <option value="gentle">Gentle</option>
            <option value="balanced">Balanced</option>
            <option value="stretch">Stretch</option>
          </Select>
        </label>
        <label className="block rounded-[var(--radius-chip)] border border-subtle bg-surface p-3">
          <span className="text-sm font-medium text-ink">Anything to keep in mind</span>
          <span className="mt-0.5 block text-sm text-ink-muted">
            Free text the coach will respect — e.g. &ldquo;keep it gentle&rdquo; or &ldquo;go easy
            on Adulting goals&rdquo;.
          </span>
          <textarea
            className="mt-2 min-h-[64px] w-full rounded-control border border-subtle bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)]"
            value={note}
            maxLength={GOAL_COACH_NOTE_MAX}
            placeholder="Optional"
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => {
              if (note.trim() !== serverNote.trim()) commit(ambition, note);
            }}
          />
        </label>
      </fieldset>

      {mutation.isError ? (
        <p className="mt-2 text-sm text-critical" role="alert">
          Could not save goals coach preferences. Try again.
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
      <GoalCoachSettingsSection />
    </>
  );
}

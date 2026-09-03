"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { isDesktopRuntime } from "@/lib/runtime/is-desktop";
import { DEFAULT_ALERT_PREFS, type AlertPrefs } from "@/lib/settings/constants";
import { useTRPC } from "@/trpc/client";

function PrefToggle({
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

export function NotificationSettingsSection() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    setDesktop(isDesktopRuntime());
  }, []);

  const { data, isLoading } = useQuery(trpc.settings.get.queryOptions());

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: trpc.settings.get.queryKey() });
  };

  const mutation = useMutation(
    trpc.settings.updateNotificationPrefs.mutationOptions({ onSuccess: invalidate })
  );
  const alertMutation = useMutation(
    trpc.settings.updateAlertPrefs.mutationOptions({ onSuccess: invalidate })
  );

  const notificationsEnabled = data?.notificationsEnabled ?? true;
  const focusDndEnabled = data?.focusDndEnabled ?? true;
  const alertPrefs = data?.alertPrefs ?? DEFAULT_ALERT_PREFS;
  const busy = isLoading || mutation.isPending;

  const save = (patch: { notificationsEnabled?: boolean; focusDndEnabled?: boolean }) => {
    mutation.mutate({
      notificationsEnabled: patch.notificationsEnabled ?? notificationsEnabled,
      focusDndEnabled: patch.focusDndEnabled ?? focusDndEnabled,
    });
  };

  const saveAlert = (patch: Partial<AlertPrefs>) => {
    alertMutation.mutate({ ...alertPrefs, ...patch });
  };

  const ALERT_TOGGLES: { key: keyof AlertPrefs; label: string; description: string }[] = [
    {
      key: "longTimer",
      label: "Long-running timer",
      description: "When a timer has run past six hours — the forgot-to-stop reminder.",
    },
    {
      key: "clientThreshold",
      label: "Client ready to invoice",
      description: "When a client passes 20 hours of unbilled time.",
    },
    {
      key: "projectOverEstimate",
      label: "Project running hot",
      description:
        "When a project’s budget runs ahead of the work done — early enough to re-scope, not after the overrun.",
    },
    {
      key: "weeklyHours",
      label: "Weekly summary",
      description: "A once-a-week recap of the hours you tracked.",
    },
  ];

  return (
    <section className="rounded-[var(--radius-row)] border border-subtle bg-surface p-4">
      <h2 className="text-sm font-semibold text-ink">Notifications</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Global controls for in-app nudges and focus-session quiet mode.
      </p>

      <fieldset className="mt-4 space-y-2" disabled={busy}>
        <legend className="sr-only">Notification preferences</legend>
        <PrefToggle
          label="Notifications"
          description="In-app nudges and gentle reminders while Kash is open."
          checked={notificationsEnabled}
          onChange={(next) => save({ notificationsEnabled: next })}
        />
        <PrefToggle
          label="Focus Do Not Disturb"
          description="Automatically enable quiet mode when a focus session starts."
          checked={focusDndEnabled}
          onChange={(next) => save({ focusDndEnabled: next })}
        />
      </fieldset>

      <fieldset
        className="mt-4 space-y-2"
        disabled={isLoading || alertMutation.isPending || !notificationsEnabled}
      >
        <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
          Which alerts fire
        </legend>
        {ALERT_TOGGLES.map((toggle) => (
          <PrefToggle
            key={toggle.key}
            label={toggle.label}
            description={toggle.description}
            checked={alertPrefs[toggle.key]}
            onChange={(next) => saveAlert({ [toggle.key]: next })}
          />
        ))}
      </fieldset>

      {!desktop ? (
        <p className="mt-4 text-sm text-ink-muted">
          For reliable reminders when this browser tab is closed, use the{" "}
          <strong className="font-medium text-ink">Kash desktop app</strong>. Web reminders only
          fire while Kash is open.
        </p>
      ) : (
        <p className="mt-4 text-sm text-ink-muted">
          On desktop, focus sessions can toggle system Do Not Disturb when the shell supports it.
        </p>
      )}

      {mutation.isError ? (
        <p className="mt-2 text-sm text-critical" role="alert">
          Could not save notification settings. Try again.
        </p>
      ) : null}
    </section>
  );
}

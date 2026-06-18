"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import type { BucketMode } from "@/lib/settings/constants";
import { DEFAULT_DAY_END_HOUR, DEFAULT_DAY_START_HOUR } from "@/lib/settings/constants";
import { useTRPC } from "@/trpc/client";

import CategorySettingsSection from "./CategorySettingsSection";

const HOUR_VALUES = Array.from({ length: 24 }, (_, h) => h);

function hourLabel(h: number): string {
  const period = h < 12 ? "AM" : "PM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${period}`;
}

const BUCKET_OPTIONS: { value: BucketMode; title: string; description: string }[] = [
  {
    value: "relative",
    title: "Relative",
    description: "Today, Tomorrow, This Week, and Later.",
  },
  {
    value: "named_days",
    title: "Named days",
    description: "Today, Tomorrow, Mon–Sun for the current week, and Later.",
  },
];

export function SettingsForm() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(trpc.settings.get.queryOptions());
  const bucketMode = data?.bucketMode ?? "relative";

  const updateMutation = useMutation(
    trpc.settings.updateBucketMode.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.settings.get.queryKey() });
        void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
      },
    })
  );

  const handleBucketChange = (mode: BucketMode) => {
    if (mode === bucketMode || updateMutation.isPending) return;
    updateMutation.mutate(mode);
  };

  const [hoursDraft, setHoursDraft] = useState<{ start: number; end: number } | null>(null);
  const startHour = hoursDraft?.start ?? data?.dayStartHour ?? DEFAULT_DAY_START_HOUR;
  const endHour = hoursDraft?.end ?? data?.dayEndHour ?? DEFAULT_DAY_END_HOUR;
  const hoursInvalid = startHour >= endHour;

  const hoursMutation = useMutation(
    trpc.settings.updateWorkingHours.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.settings.get.queryKey() });
      },
    })
  );

  const handleHoursChange = (start: number, end: number) => {
    setHoursDraft({ start, end });
    if (start < end) hoursMutation.mutate({ dayStartHour: start, dayEndHour: end });
  };

  return (
    <section className="glass-panel-opaque space-y-6 px-6 py-8">
      <h1 className="text-lg font-semibold text-kash-ink">Settings</h1>

      <section className="glass-panel rounded-[var(--kash-radius-inner)] p-4">
        <h2 className="text-sm font-semibold text-kash-ink">Day view bucket style</h2>
        <p className="mt-1 text-sm text-kash-ink-muted">
          Week view always uses Mon–Sun columns and an inbox, regardless of this setting.
        </p>
        <fieldset className="mt-4 space-y-2" disabled={isLoading || updateMutation.isPending}>
          <legend className="sr-only">Bucket style</legend>
          {BUCKET_OPTIONS.map((opt) => {
            const checked = bucketMode === opt.value;
            return (
              <label
                key={opt.value}
                className={`glass-panel flex cursor-pointer gap-3 rounded-[var(--kash-radius-chip)] p-3 transition ${
                  checked ? "ring-1 ring-kash-accent" : ""
                }`}
              >
                <input
                  type="radio"
                  name="bucketMode"
                  value={opt.value}
                  checked={checked}
                  onChange={() => handleBucketChange(opt.value)}
                  className="mt-1"
                />
                <span>
                  <span className="text-sm font-medium text-kash-ink">{opt.title}</span>
                  <span className="mt-0.5 block text-sm text-kash-ink-muted">
                    {opt.description}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
        {updateMutation.isError ? (
          <p className="mt-2 text-sm text-red-600" role="alert">
            Could not save bucket style. Try again.
          </p>
        ) : null}
      </section>

      <section className="glass-panel rounded-[var(--kash-radius-inner)] p-4">
        <h2 className="text-sm font-semibold text-kash-ink">Working hours</h2>
        <p className="mt-1 text-sm text-kash-ink-muted">
          Sets the time range shown on the Today timeline.
        </p>
        <fieldset
          className="mt-4 flex flex-wrap items-end gap-4"
          disabled={isLoading || hoursMutation.isPending}
        >
          <legend className="sr-only">Working hours</legend>
          <label className="flex flex-col gap-1 text-sm text-kash-ink-muted">
            Start
            <select
              className="glass-input"
              value={startHour}
              onChange={(e) => handleHoursChange(Number(e.target.value), endHour)}
            >
              {HOUR_VALUES.map((h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-kash-ink-muted">
            End
            <select
              className="glass-input"
              value={endHour}
              onChange={(e) => handleHoursChange(startHour, Number(e.target.value))}
            >
              {HOUR_VALUES.map((h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
          </label>
        </fieldset>
        {hoursInvalid ? (
          <p className="mt-2 text-sm text-red-600" role="alert">
            Start must be before end.
          </p>
        ) : null}
        {hoursMutation.isError ? (
          <p className="mt-2 text-sm text-red-600" role="alert">
            Could not save working hours. Try again.
          </p>
        ) : null}
      </section>

      <CategorySettingsSection />

      <section className="glass-panel rounded-[var(--kash-radius-inner)] p-4">
        <h2 className="text-sm font-semibold text-kash-ink">Accessibility</h2>
        <p className="mt-2 text-sm text-kash-ink-muted">
          Kash follows your system preferences for motion and transparency. On macOS, adjust these
          in System Settings → Accessibility → Display (Reduce motion, Reduce transparency).
        </p>
        <p className="mt-2 text-sm text-kash-ink-muted">
          There are no in-app overrides in v1 — when reduced motion or transparency is on, Kash
          disables gradient animation and uses more opaque panels instead of heavy blur.
        </p>
      </section>

      <section className="glass-panel rounded-[var(--kash-radius-inner)] p-4">
        <h2 className="text-sm font-semibold text-kash-ink">Claude (AI companion)</h2>
        <p className="mt-2 text-sm text-kash-ink-muted">
          Kash uses Claude for chat and focus narration. In v1 the API key is set by your deployment
          environment, not in this UI.
        </p>
        <p className="mt-2 text-sm text-kash-ink-muted">
          Add <code className="text-kash-ink">ANTHROPIC_API_KEY</code> to{" "}
          <code className="text-kash-ink">.env.local</code> (see{" "}
          <code className="text-kash-ink">.env.example</code>). Optional:{" "}
          <code className="text-kash-ink">ANTHROPIC_MODEL</code> to override the default model.
        </p>
      </section>

      <form action="/auth/signout" method="post">
        <button type="submit" className="glass-btn-ghost text-sm">
          Sign out
        </button>
      </form>

      <Link
        href="/today"
        className="glass-pill inline-block px-3 py-1.5 text-sm text-kash-ink-muted transition hover:text-kash-ink"
      >
        Back to plan
      </Link>
    </section>
  );
}

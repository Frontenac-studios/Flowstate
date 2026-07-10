"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import Button from "@/components/kash/ui/Button";
import Select from "@/components/kash/ui/Select";
import type { BucketMode } from "@/lib/settings/constants";
import { DEFAULT_DAY_END_HOUR, DEFAULT_DAY_START_HOUR } from "@/lib/settings/constants";
import { useTRPC } from "@/trpc/client";

import AboutMeSection from "./about-me/AboutMeSection";
import { CalendarSyncSection } from "./CalendarSyncSection";
import CategorySettingsSection from "./CategorySettingsSection";
import DefaultWeekSection from "./DefaultWeekSection";
import { NotificationsAndAssistanceSection } from "./AssistanceSettingsSection";
import { SyncStatusPanel } from "./SyncStatusPanel";

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

type TabId = "account" | "categories" | "about" | "notifications" | "preferences" | "ai" | "data";

const TABS: { id: TabId; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "categories", label: "Categories" },
  { id: "about", label: "About me" },
  { id: "notifications", label: "Notifications" },
  { id: "preferences", label: "Preferences" },
  { id: "ai", label: "AI / Kash" },
  { id: "data", label: "Data & sync" },
];

export function SettingsForm() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<TabId>("preferences");

  useEffect(() => {
    if (searchParams.get("calendar")) {
      setTab("preferences");
    }
  }, [searchParams]);

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
    <div className="space-y-6 rounded-card bg-canvas p-6">
      <h1 className="text-lg font-semibold text-ink">Settings</h1>

      <nav
        aria-label="Settings sections"
        className="rounded-[var(--radius-row)] border border-subtle bg-surface p-4"
      >
        <div
          role="tablist"
          className="inline-flex flex-wrap gap-0.5 rounded-[var(--radius-control)] bg-[var(--surface-selected)] p-0.5"
        >
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`settings-tab-${t.id}`}
                aria-selected={active}
                aria-controls={`settings-panel-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`rounded-control px-3 py-1.5 text-sm transition focus:outline-none focus-visible:shadow-[inset_0_0_0_var(--focus-ring-width)_var(--ink)] ${
                  active
                    ? "border border-active-raised-border bg-surface font-medium text-ink"
                    : "border border-transparent text-ink-muted hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>

      <div
        role="tabpanel"
        id={`settings-panel-${tab}`}
        aria-labelledby={`settings-tab-${tab}`}
        className="space-y-6"
      >
        {tab === "account" ? (
          <section className="rounded-[var(--radius-row)] border border-subtle bg-surface p-4">
            <h2 className="text-sm font-semibold text-ink">Account</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Profile and account management arrive with a later release. For now you can sign out.
            </p>
            <form action="/auth/signout" method="post" className="mt-4">
              <Button type="submit" variant="ghost" className="text-sm">
                Sign out
              </Button>
            </form>
          </section>
        ) : null}

        {tab === "categories" ? <CategorySettingsSection /> : null}

        {tab === "about" ? <AboutMeSection /> : null}

        {tab === "notifications" ? <NotificationsAndAssistanceSection /> : null}

        {tab === "preferences" ? (
          <>
            <section className="rounded-[var(--radius-row)] border border-subtle bg-surface p-4">
              <h2 className="text-sm font-semibold text-ink">Day view bucket style</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Week view always uses Mon–Sun columns and an inbox, regardless of this setting.
              </p>
              <fieldset className="mt-4 space-y-2" disabled={isLoading || updateMutation.isPending}>
                <legend className="sr-only">Bucket style</legend>
                {BUCKET_OPTIONS.map((opt) => {
                  const checked = bucketMode === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={`flex cursor-pointer gap-3 rounded-[var(--radius-chip)] border border-subtle bg-surface p-3 transition ${
                        checked ? "ring-1 ring-accent" : ""
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
                        <span className="text-sm font-medium text-ink">{opt.title}</span>
                        <span className="mt-0.5 block text-sm text-ink-muted">
                          {opt.description}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>
              {updateMutation.isError ? (
                <p className="mt-2 text-sm text-critical" role="alert">
                  Could not save bucket style. Try again.
                </p>
              ) : null}
            </section>

            <DefaultWeekSection />

            <section className="rounded-[var(--radius-row)] border border-subtle bg-surface p-4">
              <h2 className="text-sm font-semibold text-ink">Working hours</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Sets the time range shown on the Today timeline.
              </p>
              <fieldset
                className="mt-4 flex flex-wrap items-end gap-4"
                disabled={isLoading || hoursMutation.isPending}
              >
                <legend className="sr-only">Working hours</legend>
                <label className="flex flex-col gap-1 text-sm text-ink-muted">
                  Start
                  <Select
                    value={startHour}
                    onChange={(e) => handleHoursChange(Number(e.target.value), endHour)}
                  >
                    {HOUR_VALUES.map((h) => (
                      <option key={h} value={h}>
                        {hourLabel(h)}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="flex flex-col gap-1 text-sm text-ink-muted">
                  End
                  <Select
                    value={endHour}
                    onChange={(e) => handleHoursChange(startHour, Number(e.target.value))}
                  >
                    {HOUR_VALUES.map((h) => (
                      <option key={h} value={h}>
                        {hourLabel(h)}
                      </option>
                    ))}
                  </Select>
                </label>
              </fieldset>
              {hoursInvalid ? (
                <p className="mt-2 text-sm text-critical" role="alert">
                  Start must be before end.
                </p>
              ) : null}
              {hoursMutation.isError ? (
                <p className="mt-2 text-sm text-critical" role="alert">
                  Could not save working hours. Try again.
                </p>
              ) : null}
            </section>

            <CalendarSyncSection />

            <section className="rounded-[var(--radius-row)] border border-subtle bg-surface p-4">
              <h2 className="text-sm font-semibold text-ink">Accessibility</h2>
              <p className="mt-2 text-sm text-ink-muted">
                Kash follows your system preferences for motion and transparency. On macOS, adjust
                these in System Settings → Accessibility → Display (Reduce motion, Reduce
                transparency).
              </p>
              <p className="mt-2 text-sm text-ink-muted">
                There are no in-app overrides in v1 — when reduced motion or transparency is on,
                Kash disables gradient animation and uses more opaque panels instead of heavy blur.
              </p>
            </section>
          </>
        ) : null}

        {tab === "ai" ? (
          <section className="rounded-[var(--radius-row)] border border-subtle bg-surface p-4">
            <h2 className="text-sm font-semibold text-ink">Claude (AI companion)</h2>
            <p className="mt-2 text-sm text-ink-muted">
              Kash uses Claude for chat and focus narration. In v1 the API key is set by your
              deployment environment, not in this UI.
            </p>
            <p className="mt-2 text-sm text-ink-muted">
              Add <code className="text-ink">ANTHROPIC_API_KEY</code> to{" "}
              <code className="text-ink">.env.local</code> (see{" "}
              <code className="text-ink">.env.example</code>). Optional:{" "}
              <code className="text-ink">ANTHROPIC_MODEL</code> to override the default model.
            </p>
          </section>
        ) : null}

        {tab === "data" ? <SyncStatusPanel /> : null}
      </div>

      <Link
        href="/today"
        className="focus-visible:text-on-accent inline-block rounded-pill border border-border bg-surface px-3 py-1.5 text-sm text-ink-muted transition hover:text-ink focus:outline-none focus-visible:bg-ink"
      >
        Back to Today
      </Link>
    </div>
  );
}

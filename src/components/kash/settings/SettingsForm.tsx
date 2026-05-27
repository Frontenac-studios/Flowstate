"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { BucketMode } from "@/lib/settings/constants";
import { useTRPC } from "@/trpc/client";

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

  return (
    <section className="glass-panel-opaque space-y-6 px-6 py-8">
      <h1 className="text-lg font-semibold text-kash-ink">Settings</h1>

      <section className="glass-panel rounded-xl p-4">
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
                className={`glass-panel flex cursor-pointer gap-3 rounded-xl p-3 transition ${
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

      <section className="glass-panel rounded-xl p-4">
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

      <section className="glass-panel rounded-xl p-4">
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
        href="/plan"
        className="glass-pill inline-block px-3 py-1.5 text-sm text-kash-ink-muted transition hover:text-kash-ink"
      >
        Back to plan
      </Link>
    </section>
  );
}

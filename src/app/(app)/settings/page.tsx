import { Suspense } from "react";

import { SettingsForm } from "@/components/kash/settings/SettingsForm";

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-card bg-canvas p-6">
          <p className="text-sm text-ink-muted">Loading settings…</p>
        </div>
      }
    >
      <SettingsForm />
    </Suspense>
  );
}

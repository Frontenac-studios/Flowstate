import { Suspense } from "react";

import AbyssRoot from "@/components/kash/abyss/AbyssRoot";

export default function BacklogPage() {
  return (
    <Suspense fallback={<p className="text-ink-muted">Loading backlog…</p>}>
      <AbyssRoot />
    </Suspense>
  );
}

import { Suspense } from "react";

import { SurfaceCoachLayout } from "@/components/kash/chat/SurfaceCoachLayout";
import AbyssRoot from "@/components/kash/abyss/AbyssRoot";

export default function BacklogPage() {
  return (
    <SurfaceCoachLayout surface="backlog">
      <Suspense fallback={<p className="text-ink-muted">Loading backlog…</p>}>
        <AbyssRoot />
      </Suspense>
    </SurfaceCoachLayout>
  );
}

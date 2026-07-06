import { notFound } from "next/navigation";

import { AppShell } from "@/components/kash/AppShell";
import { SpacingPreviewPanel } from "@/components/kash/dev/SpacingPreviewPanel";
import { SpacingVariantInit } from "@/components/kash/dev/SpacingVariantInit";

export default function SpacingPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <>
      <SpacingVariantInit forceDesktop />
      <AppShell>
        <SpacingPreviewPanel />
      </AppShell>
    </>
  );
}
